import { createCerebras } from "@ai-sdk/cerebras";
import { generateText } from "ai";
import type { CodeChunk } from "./storage.js";
import type { IncidentReport } from "./retriever.js";
import { log } from "./tools.js";

export interface FilePatch {
  filePath: string;
  search: string; // exact code to find in the file
  replace: string; // replacement code
}

export interface PatchResult {
  success: boolean;
  patches: FilePatch[];
  error?: string;
}

export const MODEL = "qwen-3-235b-a22b-instruct-2507";

function buildPrompt(incident: IncidentReport, chunks: CodeChunk[]): string {
  const context = chunks
    .map((c) => `// ${c.metadata.file}:${c.metadata.line ?? "?"}\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are an expert Node.js SRE assistant. Analyze the buggy code and produce minimal, targeted fixes.

## Incident
- Type: ${incident.type}
- Severity: ${incident.severity}
- Service: ${incident.serviceName ?? "unknown"}
- Action: ${incident.suggested_action ?? "Fix the bug"}
- Description: ${incident.description ?? ""}

## Relevant Code
${context}

## Instructions
- Fix ONLY the specific bug causing the incident
- Keep all existing function signatures, exports, and variable names
- If memory leak: clear the accumulating data structure
- If CPU blocking (synchronous loop): replace with async setTimeout/worker
- If latency: remove artificial delays or use proper async patterns
- Make the SMALLEST possible change that fixes the issue
- Do NOT add imports, comments, or refactor unrelated code

## Output Format
For each change needed, output an edit block:

<edit file="relative/path/to/file.js">
<search>
exact code to find (must match file content precisely, include enough context to be unique)
</search>
<replace>
replacement code
</replace>
</edit>

If multiple files need changes, output multiple edit blocks.
If no change is needed, output: <no-fix/>
`;
}

export function parsePatches(response: string): FilePatch[] {
  const patches: FilePatch[] = [];

  if (response.includes("<no-fix/>")) return patches;

  const editRegex =
    /<edit\s+file="([^"]+)">\s*<search>([\s\S]*?)<\/search>\s*<replace>([\s\S]*?)<\/replace>\s*<\/edit>/g;

  let match: RegExpExecArray | null;
  while ((match = editRegex.exec(response)) !== null) {
    const filePath = match[1]!.trim();
    const search = match[2]!.trim();
    const replace = match[3]!.trim();

    if (filePath && search) {
      log(`Parsed patch for: ${filePath}`);
      patches.push({ filePath, search, replace });
    }
  }

  return patches;
}

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
      log(`Sending prompt to ${MODEL} for incident ${incident.incident_id}`);

      const startTime = Date.now();
      const timer = setInterval(() => {
        log(`LLM pending ${Math.round((Date.now() - startTime) / 1000)}s...`);
      }, 5000);

      const { text } = await generateText({
        model: this.cerebras(MODEL),
        prompt,
      });

      clearInterval(timer);
      log(`LLM responded in ${Math.round((Date.now() - startTime) / 1000)}s`);
      log(`Raw LLM output:\n${text}`);

      const patches = parsePatches(text?.trim() ?? "");
      return { success: true, patches };
    } catch (error) {
      return { success: false, patches: [], error: String(error) };
    }
  }
}
