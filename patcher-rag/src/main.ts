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



let patcher: Patcher | null = null;
let ready = false;













async function processIncident(incidentId: string): Promise<void> {
  if (!patcher) {
    log("not_ready", incidentId);
    return;
  }

  
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
    
    log(`Cloning ${repoUrl}`, incidentId);
    await cloneRepo(repoUrl, cloneDir);

    
    
    
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

    
    const retriever = new Retriever(store);
    const { chunks } = await retriever.retrieve(incidentReport);
    log(`Retrieved ${chunks.length} chunks`, incidentId);

    if (chunks.length === 0) {
      await finish(incidentId, "failed", "No relevant chunks found");
      return;
    }

    
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

    
    const baseBranch = await gitCurrentBranch(cloneDir);
    const patchBranch = `patch/${incidentId}`;
    if (!(await gitEnsureBranch(patchBranch, cloneDir))) {
      await finish(incidentId, "failed", "Failed to create git branch");
      return;
    }

    
    const appliedFiles: string[] = [];
    for (const patch of patchResult.patches) {
      
      const targetPath = path.isAbsolute(patch.filePath)
        ? patch.filePath
        : path.join(cloneDir, patch.filePath);

      
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

    
    const commitResult = await gitCommit(
      appliedFiles,
      `fix(patcher): resolve ${incident.type} incident ${incidentId}`,
      cloneDir,
    );
    if (!commitResult.success)
      log(`git commit warning: ${commitResult.message}`, incidentId);

    
    const healthy = await healthCheck(HEALTH_CHECK_URL);
    log(`health_check=${healthy}`, incidentId);

    
    const diff = await gitDiffHead(cloneDir);

    
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

    
    const patchSummary = patchResult.patches.map((p) => ({
      filePath: p.filePath,
      rationale: p.rationale,
    }));
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        prUrl: pr.success ? pr.url : undefined,
        details: {
          ...(details ?? {}),
          patches_applied: patchSummary,
          patch_analysis: patchResult.analysis ?? null,
          patch_model: MODEL,
          patched_at: new Date().toISOString(),
        },
      },
    });

    if (pr.success) {
      log(`PR: ${pr.url}`, incidentId);
    } else {
      log(`PR failed (non-fatal): ${pr.error}`, incidentId);
    }

    await finish(incidentId, "completed");
  } catch (err) {
    log(`unexpected_error=${err}`, incidentId);
    await finish(incidentId, "failed", String(err));
  } finally {
    
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



async function initializeWithRetry(apiKey: string): Promise<void> {
  while (true) {
    try {
      log("Connecting to ChromaDB Cloud...");
      
      const probe = new VectorStore();
      await probe.init("healthprobe");
      patcher = new Patcher(apiKey);
      ready = true;
      log("Service fully initialized and ready");

      
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



async function main() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error("CEREBRAS_API_KEY not set");
    process.exit(1);
  }

  
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
