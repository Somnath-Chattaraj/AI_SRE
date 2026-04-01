import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { CodeChunk } from "./storage.js";
import type { IncidentReport } from "./retriever.js";

export interface FilePatch {
  filePath: string;
  code: string;
}

export interface PatchResult {
  success: boolean;
  patches: FilePatch[];
  error?: string;
}

const MODEL = "openrouter/free";

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

      console.log("sending prompt to LLM:", prompt);

      const { text } = await generateText({
        model: this.provider(MODEL),
        system: "You are a bug-fixing bot. Output only code. Never add comments, explanations, or refactor existing code. Minimal diffs only.",
        prompt,
      });

      console.log("LLM response:", text);

      const response = text?.trim() ?? "";

      if (response.includes("No fix required")) {
        return { success: true, patches: [] };
      }

      const patches = parsePatches(response);

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