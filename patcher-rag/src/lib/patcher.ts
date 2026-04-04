import { createCerebras } from "@ai-sdk/cerebras";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { CodeChunk } from "./storage.js";
import type { IncidentReport } from "./retriever.js";
import { log } from "./tools.js";

export interface FilePatch {
  filePath: string;
  search: string;
  replace: string;
  rationale: string;
}

export interface PatchResult {
  success: boolean;
  patches: FilePatch[];
  analysis?: string;
  error?: string;
}

export const MODEL = "qwen-3-235b-a22b-instruct-2507";

// ─── Schema ───────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  analysis: z
    .string()
    .describe("Root cause analysis: what is broken, why, and which file/line is responsible"),

  patches: z
    .array(
      z.object({
        filePath: z
          .string()
          .describe("Relative path from repo root, e.g. src/index.js"),
        search: z
          .string()
          .describe(
            "Exact verbatim code to find — must match the file character-for-character including indentation",
          ),
        replace: z
          .string()
          .describe(
            "Replacement code — must differ from search in logic or behaviour, never whitespace only",
          ),
        rationale: z
          .string()
          .describe("One sentence: how this specific change resolves the incident"),
      }),
    )
    .describe("Ordered list of changes to apply. Empty array if no code change can fix this."),

  no_fix: z
    .boolean()
    .describe(
      "True ONLY for external infrastructure failures (DB down, DNS failure, cloud outage) that cannot be fixed by changing application code. If the application code itself is responsible, this MUST be false.",
    ),

  no_fix_reason: z
    .string()
    .optional()
    .describe("Required when no_fix is true — name the external dependency that failed"),
});

type PatchOutput = z.infer<typeof patchSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(incident: IncidentReport, chunks: CodeChunk[]): string {
  const context = chunks
    .map((c) => `// File: ${c.metadata.file}  Line ~${c.metadata.line ?? "?"}\n${c.content}`)
    .join("\n\n" + "─".repeat(60) + "\n\n");

  const statusLine = incident.http_status_code
    ? `- HTTP Status:  ${incident.http_status_code} (returned by blackbox probe)`
    : "";

  // Symptom-to-code mapping — tells the LLM WHAT to look for, not which file
  const symptomGuide: Record<string, string> = {
    latency: `The service is responding SLOWLY. Scan every function for:
  • setTimeout / setInterval with large delays → remove or drastically reduce the delay
  • Synchronous blocking loops (while/for that run for >10ms) → make async
  • Artificial sleep patterns → remove entirely
  The fix is almost always deleting or reducing a hardcoded delay.`,

    http_error: `The service is returning HTTP ${incident.http_status_code ?? "5xx"}. Scan every route handler for:
  • fetch() / axios / http.get() calls with incorrect or typo'd URLs → fix the URL
  • Code paths that call res.status(500) or throw inside a request handler without a catch → add try/catch or fix the underlying call
  • External API calls that will always fail (wrong domain, expired key in URL) → fix the call
  A catch block that calls res.status(500).json({error:...}) is a SYMPTOM not the cause — trace back to what threw inside the try block.`,

    downtime: `The service health check is FAILING (unreachable or crashing). Scan for:
  • Any code that runs at startup or on every request and can throw an unhandled exception
  • fetch() calls to bad URLs that reject and crash the process
  • Missing error handlers on critical paths
  Note: route handlers that return res.status(404) with a return statement are CORRECTLY WRITTEN and do NOT cause downtime.`,

    memory_leak: `Memory is growing unboundedly. Find the data structure that accumulates:
  • Arrays that get pushed to on every request but never cleared
  • Maps/Sets that grow forever → add a size cap or clear on each request`,

    cpu_spike: `CPU is pegged. Find the synchronous computation:
  • Tight while/for loops inside a request handler → make async or move to worker
  • Recursive calls without memoization on hot paths`,
  };

  const guide = symptomGuide[incident.type] ?? `Incident type: ${incident.type}. Find and fix the root cause.`;

  return `You are a senior SRE engineer doing an automated code fix. The monitoring system has confirmed an active incident — there IS a bug in the application code causing it.

## Confirmed Incident
- Type:        ${incident.type}
- Severity:    ${incident.severity}
- Service:     ${incident.serviceName ?? "unknown"}
${statusLine}
- Description: ${incident.description ?? "N/A"}
- Root cause:  ${incident.root_cause ?? "N/A"}

## What the symptom tells you about the code
${guide}

## Code to search through
${context}

## How to reason (do this step by step internally before writing patches)
1. For each code chunk, ask: "Could this specific code produce the observed symptom (${incident.type})?"
2. Ignore code that is already correctly guarded (null checks with return, working try/catch)
3. Identify the ONE most likely culprit
4. Write a patch that directly removes or fixes that culprit

## Patch rules
- \`search\` must be verbatim file content — copy it exactly, including indentation
- \`replace\` must differ in LOGIC from \`search\` — never a whitespace-only change
- Make the minimum change — do not rename variables, add imports, or refactor
- \`no_fix\` is only for external failures (cloud outage, DNS) — if the app code is the problem, always produce a patch`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

// Normalize trailing whitespace per line — catches trailing-space-only diffs
// without collapsing real structural changes (added lines, indentation shifts)
function normalize(s: string): string {
  return s
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

function validatePatches(raw: PatchOutput): FilePatch[] {
  return raw.patches.filter((p) => {
    if (!p.filePath || !p.search) return false;
    if (normalize(p.search) === normalize(p.replace)) {
      log(`Skipping whitespace-only patch for: ${p.filePath}`);
      return false;
    }
    return true;
  });
}

// ─── Patcher ─────────────────────────────────────────────────────────────────

export class Patcher {
  private cerebras: ReturnType<typeof createCerebras>;

  constructor(apiKey: string) {
    this.cerebras = createCerebras({ apiKey });
  }

  async generatePatch(
    incident: IncidentReport,
    chunks: CodeChunk[],
  ): Promise<PatchResult> {
    try {
      const prompt = buildPrompt(incident, chunks);
      log(`Sending prompt to ${MODEL} (${chunks.length} chunks) for incident ${incident.incident_id}`);

      const startTime = Date.now();
      const timer = setInterval(() => {
        log(`LLM pending ${Math.round((Date.now() - startTime) / 1000)}s...`);
      }, 5000);

      const { experimental_output: result } = await generateText({
        model: this.cerebras(MODEL),
        experimental_output: Output.object({ schema: patchSchema }),
        prompt,
      });

      clearInterval(timer);
      log(`LLM responded in ${Math.round((Date.now() - startTime) / 1000)}s`);
      log(`Analysis: ${result.analysis}`);

      if (result.no_fix) {
        log(`LLM: no fix possible — ${result.no_fix_reason ?? "no reason given"}`);
        return { success: true, patches: [], analysis: result.analysis };
      }

      const patches = validatePatches(result);
      log(`Validated ${patches.length}/${result.patches.length} patches`);

      return { success: true, patches, analysis: result.analysis };
    } catch (error) {
      return { success: false, patches: [], error: String(error) };
    }
  }
}
