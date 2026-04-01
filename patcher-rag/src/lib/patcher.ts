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

  return `You are an SRE agent fixing production bugs. Based on the incident report, generate code fixes for multiple files if needed.

## Incident Report
- ID: ${incident.incident_id}
- Metric: ${incident.metric_analyzed}
- Failing Service: ${incident.failing_service ?? "unknown"}
- Suggested Action: ${incident.suggested_action ?? "none"}

## Relevant Code Context
${context}

## Instructions
1. Analyze the incident and code context
2. Provide complete fixed code for ALL affected files
3. Use the following format for each file:
// File: path/to/file.js
\`\`\`javascript
// code here
\`\`\`
4. Only output valid JavaScript code that can be saved directly to a file
5. If no fix is needed, output "// No fix required"
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

      const { text } = await generateText({
        model: this.provider(MODEL),
        prompt,
      });

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