import { generateText, Output } from "ai";
import { createCerebras } from "@ai-sdk/cerebras";
import { z } from "zod";

const cerebras = createCerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

const anomalySchema = z.object({
  isAnomaly: z
    .boolean()
    .describe(
      "True only if you are highly confident this is a real incident, not noise or a transient blip",
    ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Your confidence that this is a genuine anomaly (0 = definitely normal, 100 = definitely anomalous)",
    ),
  reason: z
    .string()
    .describe("Concise technical explanation referencing specific metric values"),
  severity: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .describe("Severity only when isAnomaly is true"),
  suggested_action: z
    .string()
    .describe("Specific, actionable fix for the SRE on-call"),
});

export type AIAnomalyResult = z.infer<typeof anomalySchema>;

export interface MetricStats {
  mean: number;
  stddev: number;
  zScore: number;
  latestValue: number;
}

export async function analyzeMetrics(
  serviceId: string,
  downtimeDetected: boolean,
  latencySpikeDetected: boolean,
  dataPointsConfig: {
    durationSeconds: [number, number][];
    success: [number, number][];
  },
  stats: { duration: MetricStats },
): Promise<AIAnomalyResult> {
  // AI SDK v6: generateText + Output.object is the non-deprecated path for
  // structured output. It uses the model's native JSON mode under the hood.
  const model = cerebras("qwen-3-235b-a22b-instruct-2507");

  const recentDuration = dataPointsConfig.durationSeconds.slice(-5);
  const recentSuccess = dataPointsConfig.success.slice(-5);

  const prompt = `You are a conservative SRE anomaly validator. False positives are expensive — only confirm an anomaly when the evidence is unambiguous.

Service: ${serviceId}

## Statistical Summary (probe_duration_seconds, last 10 min baseline)
- Baseline mean:   ${stats.duration.mean.toFixed(4)}s
- Baseline stddev: ${stats.duration.stddev.toFixed(4)}s
- Latest value:    ${stats.duration.latestValue.toFixed(4)}s
- Z-score:         ${stats.duration.zScore.toFixed(2)}σ  (alert threshold: 3.0σ)

## Rule-based flags (pre-computed)
- Service down (probe_success = 0 in 2+ of last 3 checks): ${downtimeDetected}
- Latency spike (z > 3.0σ AND > 2s for 2 consecutive points): ${latencySpikeDetected}

## Last 5 probe_success values [timestamp, value]:
${JSON.stringify(recentSuccess)}

## Last 5 probe_duration_seconds values [timestamp, value]:
${JSON.stringify(recentDuration)}

## Instructions
- A z-score below 2.5 is almost certainly noise — set isAnomaly=false
- A single bad data point is NOT an anomaly — look for sustained patterns
- If probe data is sparse or the service just started, set isAnomaly=false
- Set confidence below 70 if you have any doubt
- Only set severity=CRITICAL for sustained downtime or z > 5σ`;

  const { experimental_output: result } = await generateText({
    model,
    experimental_output: Output.object({ schema: anomalySchema }),
    prompt,
    abortSignal: AbortSignal.timeout(30_000),
  });

  return result;
}
