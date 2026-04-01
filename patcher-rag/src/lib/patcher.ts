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

  return `Fix the bug in the provided code based on the incident. Output ONLY the complete file contents that need changing.

## Incident
- ${incident.metric_analyzed}: ${incident.suggested_action ?? "Investigate and fix"}

## Code
${context}

## Rules
- Minimal changes only - fix the bug, nothing else
- Preserve existing code style, naming, patterns
- No added comments explaining the fix
- No refactoring unrelated code
- No TODOs or explanatory notes
- Output format per file:
// File: filename.js
\`\`\`javascript
// complete file contents
\`\`\`
- If no fix needed: "// No fix required"
`;
}

function parsePatches(response: string): FilePatch[] {
  const patches: FilePatch[] = [];
  const sections = response.split(/\/\/\s*File:/);

  for (const section of sections) {
    if (!section.trim() || section.includes("No fix required")) {
      continue;
    }

    const lines = section.trim().split("\n");
    const filePath = lines[0]?.trim() ?? "";

    let code = lines.slice(1).join("\n").trim();

    const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      code = codeMatch[1]!.trim();
    }

    if (filePath && code) {
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
        log(`LLM response pending for ${Math.round((Date.now() - startTime) / 1000)}s...`);
      }, 5000);

      const { text } = await generateText({
        model: this.provider(MODEL),
        prompt,
      });

      clearInterval(id);
      log(`LLM response received in ${Math.round((Date.now() - startTime) / 1000)}s`);
      log(`LLM response length for incident ${incident.incident_id}: ${text?.length ?? 0} characters`);
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