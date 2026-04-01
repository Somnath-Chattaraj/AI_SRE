import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { CodeChunk } from "./storage.js";
import type { IncidentReport } from "./retriever.js";
import { log } from "./tools.js";

export interface FilePatch {
  filePath: string;
  code: string;
}

export interface PatchResult {
  success: boolean;
  patches: FilePatch[];
  error?: string;
}

export const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

function buildPrompt(incident: IncidentReport, chunks: CodeChunk[]): string {
  const context = chunks
    .map((c) => `// ${c.metadata.file}:${c.metadata.line ?? "?"}\n${c.content}`)
    .join("\n\n");

  return `You are an expert Node.js debugging assistant. Analyze the code and fix the bug described in the incident.

## Incident
- Metric: ${incident.metric_analyzed}
- Service: ${incident.failing_service ?? "unknown"}
- Action: ${incident.suggested_action ?? "Fix the bug"}

## Code to Fix
${context}

## Requirements
- Output COMPLETE file content (all exports, imports, etc.)
- Keep existing function signatures and variable names
- Fix only the buggy code - minimal changes
- If memory leak: ensure data is properly released/cleared
- If CPU blocking: use async patterns (setTimeout, Promises, worker threads)
- If async issue: use proper async/await or callbacks
- Do NOT add comments, TODOs, or explanations

## Output Format (STRICT)
For each file needing changes:
// File: utils.js
\`\`\`javascript
// FULL file content with fix applied
\`\`\`

If no changes needed:
// No fix required
`;
}

export function parsePatches(response: string): FilePatch[] {
  const patches: FilePatch[] = [];
  const sections = response.split(/\/\/\s*File:/);

  for (const section of sections) {
    if (!section.trim() || section.includes("No fix required")) {
      continue;
    }

    const lines = section.trim().split("\n");
    const filePath = lines[0]?.trim() ?? "";

    let code = lines.slice(1).join("\n").trim();

    const codeMatch = code.match(/```(?:javascript)?\n([\s\S]*?)```/) 
      || code.match(/```javascript([\s\S]*?)```/i)
      || code.match(/```javascript\n([\s\S]*)```/i)
      || code.match(/javascript\n([\s\S]*)$/i)
      || code.match(/^javascript([\s\S]*)$/i)
      || code.match(/^let[\s\S]*$/);

    if (codeMatch) {
      code = codeMatch[1]!.trim();
    }

    if (filePath && code) {
      log(`Parsed patch for file: ${filePath} with code ${code}`);
      patches.push({ filePath, code });
    }
  }

  return patches;
}

export class Patcher {
  private provider: ReturnType<typeof createOpenRouter>;

  constructor(apiKey: string) {
    this.provider = createOpenRouter({ apiKey });
  }

  async generatePatch(
    incident: IncidentReport,
    chunks: CodeChunk[],
  ): Promise<PatchResult> {
    try {
      const prompt = buildPrompt(incident, chunks);

      log(`Generated prompt for incident ${incident.incident_id}:\n${prompt}`);

      const startTime = Date.now();
      const id = setInterval(() => {
        log(
          `LLM response pending for ${Math.round((Date.now() - startTime) / 1000)}s...`,
        );
      }, 5000);

      const { text } = await generateText({
        model: this.provider(MODEL),
        prompt,
      });

      clearInterval(id);
      log(
        `LLM response received in ${Math.round((Date.now() - startTime) / 1000)}s`,
      );
      log(
        `LLM response length for incident ${incident.incident_id}: ${text?.length ?? 0} characters`,
      );
      log(`LLM response: ${text}`);

      const patches = parsePatches(text?.trim() ?? "");

      return {
        success: true,
        patches,
      };
    } catch (error) {
      return {
        success: false,
        patches: [],
        error: String(error),
      };
    }
  }
}
