import path from "path";
import prisma from "../lib/db.js";
import { VectorStore } from "./lib/storage.js";
import { Retriever } from "./lib/retriever.js";
import { MODEL, Patcher } from "./lib/patcher.js";
import { indexDirectory } from "./lib/indexer.js";
import {
  cloneRepo,
  cleanupRepo,
  replaceInFile,
  readFileContent,
  gitCommit,
  gitEnsureBranch,
  gitCurrentBranch,
  gitLog,
  gitRevert,
  gitDiffHead,
  healthCheck,
  createGitHubPR,
  log,
} from "./lib/tools.js";

const HEALTH_CHECK_URL =
  process.env.HEALTH_CHECK_URL ?? "http://localhost:6969/health";
const PORT = Number(process.env.PATCHER_PORT ?? 4000);
const CLONE_BASE = process.env.CLONE_BASE ?? "/tmp/patcher";

// ─── Shared singletons (initialized lazily) ───────────────────────────────────

let patcher: Patcher | null = null;
let ready = false;

// ─── Per-incident workflow ────────────────────────────────────────────────────
//
//  1. Look up incident + service in DB
//  2. git clone service.url_codebase → /tmp/patcher/{incidentId}/
//  3. Index cloned source files into a per-service ChromaDB collection
//  4. RAG: retrieve the most relevant code chunks for this incident
//  5. LLM: generate precise search/replace patches
//  6. Apply patches (exact string replacement — no full-file rewrites)
//  7. git commit on a new branch, push, open a GitHub PR
//  8. Health-check the running service (optional)
//  9. Cleanup temp clone
//
async function processIncident(incidentId: string): Promise<void> {
  if (!patcher) {
    log("not_ready", incidentId);
    return;
  }

  // ── Fetch incident ──────────────────────────────────────────────────────────
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incident) {
    log("incident_not_found", incidentId);
    return;
  }
  if (incident.patchStatus !== "PENDING") {
    log(`skipping status=${incident.patchStatus}`, incidentId);
    return;
  }

  // Fetch service separately — avoids crash on broken MongoDB reference
  const service = await prisma.service.findUnique({
    where: { id: incident.serviceId },
  });
  const serviceName = service?.name ?? "unknown";
  const repoUrl = service?.url_codebase;

  if (!repoUrl || repoUrl === "http://github.com") {
    log("no_repo_url — cannot patch without url_codebase", incidentId);
    await prisma.incident.update({
      where: { id: incidentId },
      data: { patchStatus: "FAILED" },
    });
    return;
  }

  await prisma.incident.update({
    where: { id: incidentId },
    data: { patchStatus: "PROCESSING" },
  });

  const details = incident.details as Record<string, unknown> | null;
  const incidentReport = {
    incident_id: incident.id,
    type: incident.type,
    severity: incident.severity,
    description: incident.description ?? undefined,
    suggested_action: (details?.recommended_action as string) ?? (details?.suggested_action as string) ?? undefined,
    root_cause: (details?.root_cause as string) ?? undefined,
    http_status_code: (details?.http_status_code as number) ?? undefined,
    serviceName,
  };

  const cloneDir = path.join(CLONE_BASE, incidentId);

  try {
    // ── 1. Clone ──────────────────────────────────────────────────────────────
    log(`Cloning ${repoUrl}`, incidentId);
    await cloneRepo(repoUrl, cloneDir);

    // ── 2. Index into a per-service ChromaDB collection ───────────────────────
    //    Collection is named by serviceId so re-runs for the same service reuse
    //    the same vector space (upsert is idempotent).
    const collectionName = `service-${incident.serviceId}`;
    const store = new VectorStore();
    await store.init(collectionName);
    log(`Indexing ${cloneDir} → collection "${collectionName}"`, incidentId);
    const chunkCount = await indexDirectory(cloneDir, store);
    log(`Indexed ${chunkCount} chunks`, incidentId);

    if (chunkCount === 0) {
      await finish(incidentId, "failed", "No source files found in repo");
      return;
    }

    // ── 3. Retrieve relevant code chunks ──────────────────────────────────────
    const retriever = new Retriever(store);
    const { chunks } = await retriever.retrieve(incidentReport);
    log(`Retrieved ${chunks.length} chunks`, incidentId);

    if (chunks.length === 0) {
      await finish(incidentId, "failed", "No relevant chunks found");
      return;
    }

    // ── 4. Generate patches ───────────────────────────────────────────────────
    const patchResult = await patcher.generatePatch(incidentReport, chunks);
    if (patchResult.analysis) log(`Analysis: ${patchResult.analysis}`, incidentId);
    if (!patchResult.success) {
      await finish(incidentId, "failed", patchResult.error);
      return;
    }
    if (!patchResult.patches.length) {
      log("LLM: no valid patch produced — marking failed for retry", incidentId);
      await finish(incidentId, "failed", patchResult.analysis ?? "LLM produced no valid patch");
      return;
    }

    // ── 5. Create patch branch ────────────────────────────────────────────────
    const baseBranch = await gitCurrentBranch(cloneDir);
    const patchBranch = `patch/${incidentId}`;
    if (!(await gitEnsureBranch(patchBranch, cloneDir))) {
      await finish(incidentId, "failed", "Failed to create git branch");
      return;
    }

    // ── 6. Apply search/replace patches ──────────────────────────────────────
    const appliedFiles: string[] = [];
    for (const patch of patchResult.patches) {
      // LLM returns relative paths (e.g. "src/utils.js") — resolve inside clone
      const targetPath = path.isAbsolute(patch.filePath)
        ? patch.filePath
        : path.join(cloneDir, patch.filePath);

      // Security: prevent path traversal outside the clone directory
      const resolvedTarget = path.resolve(targetPath);
      const resolvedClone = path.resolve(cloneDir);
      if (!resolvedTarget.startsWith(resolvedClone + path.sep)) {
        log(`Security: path traversal blocked: ${patch.filePath}`, incidentId);
        await finish(incidentId, "failed", `Invalid patch path: ${patch.filePath}`);
        return;
      }

      const existing = await readFileContent(targetPath);
      if (existing === null) {
        log(`File not found: ${targetPath}`, incidentId);
        await revertAll(appliedFiles, cloneDir, incidentId);
        await finish(incidentId, "failed", `File not found: ${patch.filePath}`);
        return;
      }

      log(`Patching ${patch.filePath}`, incidentId);
      const result = await replaceInFile(
        targetPath,
        patch.search,
        patch.replace,
      );
      if (!result.success) {
        log(`replaceInFile failed: ${result.error}`, incidentId);
        await revertAll(appliedFiles, cloneDir, incidentId);
        await finish(incidentId, "failed", result.error);
        return;
      }
      appliedFiles.push(targetPath);
    }

    // ── 7. Commit ─────────────────────────────────────────────────────────────
    const commitResult = await gitCommit(
      appliedFiles,
      `fix(patcher): resolve ${incident.type} incident ${incidentId}`,
      cloneDir,
    );
    if (!commitResult.success)
      log(`git commit warning: ${commitResult.message}`, incidentId);

    // ── 8. Health check (best-effort, doesn't block the PR) ──────────────────
    const healthy = await healthCheck(HEALTH_CHECK_URL);
    log(`health_check=${healthy}`, incidentId);

    // ── 9. Generate diff for PR body ──────────────────────────────────────────
    const diff = await gitDiffHead(cloneDir);

    // ── 10. Push + open PR ────────────────────────────────────────────────────
    const patchLines = patchResult.patches.map(
      (p) => `- \`${p.filePath}\` — ${p.rationale}`,
    );
    const pr = await createGitHubPR({
      branch: patchBranch,
      baseBranch,
      title: `[Auto-Patch] ${incident.title}`,
      body: [
        "## Root Cause Analysis",
        patchResult.analysis ?? "(see description)",
        "",
        "## Incident Details",
        `| Field | Value |`,
        `|---|---|`,
        `| Incident | \`${incidentId}\` |`,
        `| Type | ${incident.type} |`,
        `| Severity | ${incident.severity} |`,
        `| Service | ${serviceName} |`,
        `| Description | ${incident.description ?? "N/A"} |`,
        `| Suggested Action | ${(details?.recommended_action as string) ?? (details?.suggested_action as string) ?? "N/A"} |`,
        "",
        "## Changes",
        patchLines.join("\n"),
        "",
        diff ? `<details><summary>Diff</summary>\n\n\`\`\`diff\n${diff}\n\`\`\`\n</details>` : "",
        "",
        `**Model:** ${MODEL} | **Health check:** ${healthy ? "passed ✓" : "skipped / failed ✗"}`,
        "",
        "> Auto-generated by AI SRE patcher",
      ]
        .filter((l) => l !== null)
        .join("\n"),
      repoDir: cloneDir,
    });

    if (pr.success) log(`PR: ${pr.url}`, incidentId);
    else log(`PR failed (non-fatal): ${pr.error}`, incidentId);

    await finish(incidentId, "completed");
  } catch (err) {
    log(`unexpected_error=${err}`, incidentId);
    await finish(incidentId, "failed", String(err));
  } finally {
    // Always clean up the clone
    await cleanupRepo(cloneDir);
    log("clone_cleaned_up", incidentId);
  }
}

async function revertAll(
  files: string[],
  repoDir: string,
  _incidentId: string,
): Promise<void> {
  if (!files.length) return;
  const history = await gitLog(repoDir, 2);
  const prevCommit = history.split("\n")[1]?.split(" ")[0];
  if (prevCommit) await gitRevert(prevCommit, repoDir);
}

async function finish(
  incidentId: string,
  status: "completed" | "failed",
  error?: string,
): Promise<void> {
  await prisma.incident.update({
    where: { id: incidentId },
    data: { patchStatus: status === "completed" ? "RESOLVED" : "FAILED" },
  });
  log(`${status}${error ? ` reason=${error}` : ""}`, incidentId);
}

// ─── Background initializer ───────────────────────────────────────────────────

async function initializeWithRetry(apiKey: string): Promise<void> {
  while (true) {
    try {
      log("Connecting to ChromaDB Cloud...");
      // Probe connectivity by creating a throwaway VectorStore
      const probe = new VectorStore();
      await probe.init("healthprobe");
      patcher = new Patcher(apiKey);
      ready = true;
      log("Service fully initialized and ready");

      // Reset stuck incidents from a previous crash
      const stuck = await prisma.incident.findMany({
        where: { patchStatus: "PROCESSING" },
        select: { id: true },
      });
      for (const { id } of stuck) {
        await prisma.incident.update({
          where: { id },
          data: { patchStatus: "PENDING" },
        });
      }
      if (stuck.length) log(`Reset ${stuck.length} stuck incidents to PENDING`);
      break;
    } catch (err) {
      log(`Init failed, retrying in 5s: ${err}`);
      await Bun.sleep(5000);
    }
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error("CEREBRAS_API_KEY not set");
    process.exit(1);
  }

  // Bind port immediately — Docker healthcheck needs this
  Bun.serve({
    port: PORT,
    routes: {
      "/health": {
        GET: () =>
          ready
            ? Response.json({ status: "ready", model: MODEL })
            : new Response("Starting", { status: 503 }),
      },
      "/trigger": {
        POST: async (req: Request) => {
          if (!ready)
            return new Response("Service starting, retry shortly", {
              status: 503,
            });
          let body: { incidentId?: string };
          try {
            body = (await req.json()) as { incidentId?: string };
          } catch {
            return new Response("Bad JSON", { status: 400 });
          }
          const { incidentId } = body;
          if (!incidentId)
            return new Response("incidentId required", { status: 400 });
          log(`Trigger received`, incidentId);
          processIncident(incidentId).catch((err) =>
            log(`error=${err}`, incidentId),
          );
          return Response.json({ queued: true, incidentId });
        },
      },
      "/retry/:id": {
        POST: async (req: Request) => {
          const incidentId = (
            req as Request & { params: Record<string, string> }
          ).params["id"]!;
          await prisma.incident.update({
            where: { id: incidentId },
            data: { patchStatus: "PENDING" },
          });
          processIncident(incidentId).catch((err) =>
            log(`retry_error=${err}`, incidentId),
          );
          return Response.json({ retrying: true, incidentId });
        },
      },
    },
  });

  log(`HTTP server listening on :${PORT}`);
  initializeWithRetry(apiKey).catch(console.error);
}

main().catch(console.error);
