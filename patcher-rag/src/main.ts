import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { VectorStore } from "./lib/storage.js";
import { Retriever, type IncidentReport } from "./lib/retriever.js";
import { Patcher } from "./lib/patcher.js";
import {
  writeFileContent,
  gitCommit,
  pm2Restart,
  healthCheck,
  gitRevert,
  gitLog,
} from "./lib/tools.js";

const REPORTS_DIR = "../Anomaly_Detection/reports";
const PATCH_REPORT_DIR = "./patch_reports";
const POLL_INTERVAL_MS = 10000;
const HEALTH_CHECK_URL = "http://localhost:3000/health";
const PM2_SERVICE_NAME = "buggy-app";
const PROCESSED_FILE = ".processed_incidents";

interface PatchReport {
  incident_id: string;
  timestamp: string;
  metric_analyzed: string;
  failing_service: string;
  patches_applied: Array<{ file: string; success: boolean }>;
  health_check_passed: boolean;
  reverted: boolean;
}

const log = (msg: string, id?: string) => {
  const ts = new Date().toISOString().split("T")[1]?.split(".")[0];
  console.log(`[${ts}] ${id ? `[${id}] ` : ""}${msg}`);
};

async function loadProcessedIds(): Promise<Set<string>> {
  try {
    const content = await readFile(PROCESSED_FILE, "utf-8");
    return new Set(JSON.parse(content));
  } catch {
    return new Set();
  }
}

async function saveProcessedIds(ids: Set<string>): Promise<void> {
  await writeFileContent(PROCESSED_FILE, JSON.stringify(Array.from(ids)));
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
    } catch {
      continue;
    }
  }

  return reports;
}

async function processIncident(
  incident: IncidentReport,
  retriever: Retriever,
  patcher: Patcher,
  processed: Set<string>,
): Promise<void> {
  log("start", incident.incident_id);

  const patchReport: PatchReport = {
    incident_id: incident.incident_id,
    timestamp: new Date().toISOString(),
    metric_analyzed: incident.metric_analyzed,
    failing_service: incident.failing_service ?? "unknown",
    patches_applied: [],
    health_check_passed: false,
    reverted: false,
  };

  try {
    const result = await retriever.retrieve(incident);
    log(`chunks=${result.chunks.length}`, incident.incident_id);

    if (result.chunks.length === 0) {
      await savePatchReport(patchReport);
      processed.add(incident.incident_id);
      return;
    }

    const patchResult = await patcher.generatePatch(incident, result.chunks);

    if (!patchResult.success) {
      log(`patch_err=${patchResult.error}`, incident.incident_id);
      await savePatchReport(patchReport);
      processed.add(incident.incident_id);
      return;
    }

    if (!patchResult.patches || patchResult.patches.length === 0) {
      log("no_patch", incident.incident_id);
      processed.add(incident.incident_id);
      await savePatchReport(patchReport);
      return;
    }

    let allWritesSuccessful = true;

    for (const patch of patchResult.patches) {
      const targetPath = patch.filePath
        ? path.join("../application/src", patch.filePath)
        : "../application/src/server.js";

      const writeSuccess = await writeFileContent(targetPath, patch.code);
      patchReport.patches_applied.push({ file: targetPath, success: writeSuccess });

      if (!writeSuccess) {
        allWritesSuccessful = false;
        break;
      }

      const commitResult = await gitCommit(targetPath, `Fix: ${incident.incident_id}`);
      if (!commitResult.success) {
        log(`git_err=${commitResult.message}`, incident.incident_id);
      }
    }

    if (!allWritesSuccessful) {
      log("write_fail", incident.incident_id);
      await revertPatches(patchResult.patches, patchReport, processed, incident);
      return;
    }

    await pm2Restart(PM2_SERVICE_NAME);
    await new Promise((r) => setTimeout(r, 5000));

    const healthy = await healthCheck(HEALTH_CHECK_URL);

    if (!healthy) {
      log("health_fail", incident.incident_id);
      await revertPatches(patchResult.patches, patchReport, processed, incident);
    } else {
      log("done", incident.incident_id);
      patchReport.health_check_passed = true;
      processed.add(incident.incident_id);
      await savePatchReport(patchReport);
    }
  } catch (e) {
    log(`error=${e}`, incident.incident_id);
    await savePatchReport(patchReport);
    processed.add(incident.incident_id);
  }
}

async function revertPatches(
  patches: Array<{ filePath?: string }>,
  patchReport: PatchReport,
  processed: Set<string>,
  incident: IncidentReport,
): Promise<void> {
  const firstPatch = patches[0];
  if (!firstPatch) return;

  const firstPath = firstPatch.filePath
    ? path.join("../application/src", firstPatch.filePath)
    : "../application/src/server.js";

  const logResult = await gitLog(firstPath, 2);
  const commits = logResult.split("\n");
  const prevCommit = commits[1]?.split(" ")[0];

  if (prevCommit) {
    for (const patch of patches) {
      const targetPath = patch.filePath
        ? path.join("../application/src", patch.filePath)
        : "../application/src/server.js";
      await gitRevert(prevCommit, targetPath);
    }
    await pm2Restart(PM2_SERVICE_NAME);
  }

  patchReport.reverted = true;
  await savePatchReport(patchReport);
  processed.add(incident.incident_id);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const store = new VectorStore();
  await store.init("codebase");

  const retriever = new Retriever(store);
  const patcher = new Patcher(apiKey);
  const processed = await loadProcessedIds();

  log(`init processed=${processed.size}`);

  while (true) {
    try {
      const reports = await readReports();

      for (const report of reports) {
        if (processed.has(report.incident_id)) continue;
        if (report.status === "RESOLVED") {
          processed.add(report.incident_id);
          continue;
        }

        await processIncident(report, retriever, patcher, processed);
        await saveProcessedIds(processed);
      }
    } catch (e) {
      log(`poll_err=${e}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
