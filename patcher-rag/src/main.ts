import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { VectorStore } from "./lib/storage.js";
import { Retriever, type IncidentReport } from "./lib/retriever.js";
import { MODEL, Patcher } from "./lib/patcher.js";
import {
  writeFileContent,
  readFileContent,
  gitCommit,
  gitEnsureBranch,
  pm2Restart,
  healthCheck,
  gitRevert,
  gitLog,
  resolveAppPath,
} from "./lib/tools.js";
import { log } from "./lib/tools.js";

const REPORTS_DIR = "../Anomaly_Detection/reports";
const PATCH_REPORT_DIR = "patcher-rag/patch_reports";
const POLL_INTERVAL_MS = 10000;
const PROCESSED_FILE = "patcher-rag/.processed_incidents";
const HEALTH_CHECK_URL = "http://localhost:6969/health";
const PM2_SERVICE_NAME = "buggy-app";

interface PatchReport {
  incident_id: string;
  timestamp: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  metric_analyzed: string;
  failing_service: string;
  suggested_action?: string;
  status: "processing" | "completed" | "failed" | "reverted";
  chunks_retrieved: number;
  model_used: string;
  patches_applied: Array<{ file: string; success: boolean; commit_hash?: string; error?: string }>;
  health_check_passed: boolean;
  health_check_url?: string;
  health_check_duration_ms?: number;
  reverted: boolean;
  revert_reason?: string;
  error?: string;
}

const finishReport = async (
  report: PatchReport,
  status: PatchReport["status"],
  processed: Set<string>,
  error?: string,
) => {
  report.status = status;
  report.error = error;
  report.completed_at = new Date().toISOString();
  report.duration_ms = Date.now() - new Date(report.started_at).getTime();
  await savePatchReport(report);
  processed.add(report.incident_id);
};

async function loadProcessedIds(): Promise<Set<string>> {
  try {
    const content = await readFileContent(PROCESSED_FILE);
    return content ? new Set(JSON.parse(content)) : new Set();
  } catch {
    return new Set();
  }
}

async function saveProcessedIds(ids: Set<string>): Promise<void> {
  await writeFileContent(PROCESSED_FILE, JSON.stringify([...ids]));
}

async function savePatchReport(report: PatchReport): Promise<void> {
  const fileName = `patch_report_${report.incident_id}.json`;
  await writeFileContent(path.join(PATCH_REPORT_DIR, fileName), JSON.stringify(report, null, 2));
}

async function readReports(): Promise<IncidentReport[]> {
  const files = await readdir(REPORTS_DIR);
  const reports: IncidentReport[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = await readFile(path.join(REPORTS_DIR, file), "utf-8");
      reports.push(JSON.parse(content) as IncidentReport);
    } catch { continue; }
  }
  return reports;
}

async function revertPatches(patches: Array<{ filePath?: string }>, report: PatchReport, processed: Set<string>) {
  const first = patches[0];
  if (!first) return;
  const log = await gitLog(resolveAppPath(first.filePath), 2);
  const prevCommit = log.split("\n")[1]?.split(" ")[0];
  if (prevCommit) {
    for (const p of patches) await gitRevert(prevCommit, resolveAppPath(p.filePath));
    await pm2Restart(PM2_SERVICE_NAME);
  }
  await finishReport(report, "reverted", processed);
}

async function processIncident(incident: IncidentReport, retriever: Retriever, patcher: Patcher, processed: Set<string>) {
  log("start", incident.incident_id);

  const report: PatchReport = {
    incident_id: incident.incident_id,
    timestamp: new Date().toISOString(),
    started_at: new Date().toISOString(),
    metric_analyzed: incident.metric_analyzed,
    failing_service: incident.failing_service ?? "unknown",
    suggested_action: incident.suggested_action,
    status: "processing",
    chunks_retrieved: 0,
    model_used: MODEL,
    patches_applied: [],
    health_check_passed: false,
    health_check_url: HEALTH_CHECK_URL,
    reverted: false,
  };

  try {
    const result = await retriever.retrieve(incident);

    report.chunks_retrieved = result.chunks.length;
    log(`chunks=${result.chunks.length}`, incident.incident_id);

    if (result.chunks.length === 0) {
      await finishReport(report, "completed", processed);
      return;
    }

    const patchResult = await patcher.generatePatch(incident, result.chunks);
    if (!patchResult.success) {
      log(`patch_err=${patchResult.error}`, incident.incident_id);
      await finishReport(report, "failed", processed, patchResult.error);
      return;
    }

    if (!patchResult.patches?.length) {
      log("no_patch", incident.incident_id);
      await finishReport(report, "completed", processed);
      return;
    }

    const branchName = `patch/${incident.incident_id}`;
    
    if (!await gitEnsureBranch(branchName)) {
      await finishReport(report, "failed", processed, "Failed to create branch");
      return;
    }

    for (const patch of patchResult.patches) {
      const targetPath = resolveAppPath(patch.filePath);
      const writeSuccess = await writeFileContent(targetPath, patch.code);

      const entry: { file: string; success: boolean; commit_hash?: string; error?: string } = {
        file: targetPath, success: writeSuccess,
      };

      if (!writeSuccess) {
        entry.error = "Failed to write file";
        report.patches_applied.push(entry);
        report.revert_reason = "File write failed";
        await revertPatches(patchResult.patches, report, processed);
        return;
      }

      const commitResult = await gitCommit(targetPath, `Fix: ${incident.incident_id} @ ${Date.now()}`);

      if (commitResult.success) {
        entry.commit_hash = commitResult.message.match(/[a-f0-9]{7}/)?.[0];
      } else {
        entry.error = commitResult.message;
        log(`git_err=${commitResult.message}`, incident.incident_id);
      }
      report.patches_applied.push(entry);
    }

    await pm2Restart(PM2_SERVICE_NAME);
    await new Promise(r => setTimeout(r, 5000));

    const healthStart = Date.now();
    const healthy = await healthCheck(HEALTH_CHECK_URL);
    report.health_check_duration_ms = Date.now() - healthStart;

    if (!healthy) {
      report.revert_reason = "Health check failed";
      await revertPatches(patchResult.patches, report, processed);
    } else {
      log("done", incident.incident_id);
      report.health_check_passed = true;
      await finishReport(report, "completed", processed);
    }
  } catch (e) {
    await finishReport(report, "failed", processed, String(e));
  }
}


async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { console.error("OPENROUTER_API_KEY not set"); process.exit(1); }

  const store = new VectorStore();
  await store.init("codebase");
  const retriever = new Retriever(store);
  const patcher = new Patcher(apiKey);
  const processed = await loadProcessedIds();
  
  while (true) {
    try {
      const reports = await readReports();
      for (const report of reports) {
        if (processed.has(report.incident_id) || report.status === "RESOLVED") {
          if (report.status === "RESOLVED") processed.add(report.incident_id);
          continue;
        }
        await processIncident(report, retriever, patcher, processed);
        await saveProcessedIds(processed);
      }
    } catch (e) { log(`poll_err=${e}`); }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
