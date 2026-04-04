import { generateText, Output } from "ai";
import { createCerebras } from "@ai-sdk/cerebras";
import { z } from "zod";

const cerebras = createCerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

const anomalySchema = z.object({
  anomaly: z
    .boolean()
    .describe(
      "True only if you are highly confident this is a real incident, not noise or a transient blip",
    ),
  severity: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .describe("Severity level when anomaly is true"),
  reason: z
    .string()
    .describe("Concise technical explanation referencing specific metric values"),
  root_cause: z
    .string()
    .describe(
      "Probable root cause: e.g. service crash, deployment issue, network failure, SSL misconfiguration, backend dependency failure",
    ),
  recommended_action: z
    .enum([
      "restart_service",
      "rollback_deployment",
      "scale_up_service",
      "ignore",
      "escalate_to_human",
    ])
    .describe("Best corrective action for the on-call SRE"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence that this is a genuine anomaly (0.0 = definitely normal, 1.0 = definitely anomalous)",
    ),
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
    httpStatusCode: [number, number][];
    httpSsl: [number, number][];
    httpContentLength: [number, number][];
  },
  stats: { duration: MetricStats },
): Promise<AIAnomalyResult> {
  const model = cerebras("qwen-3-235b-a22b-instruct-2507");

  const recentDuration = dataPointsConfig.durationSeconds.slice(-5);
  const recentSuccess = dataPointsConfig.success.slice(-5);
  const latestStatus = dataPointsConfig.httpStatusCode.at(-1)?.[1] ?? null;
  const latestSsl = dataPointsConfig.httpSsl.at(-1)?.[1] ?? null;
  const latestContentLength = dataPointsConfig.httpContentLength.at(-1)?.[1] ?? null;
  const prompt = `You are a conservative SRE anomaly validator. Analyze system health, detect anomalies, classify severity, identify root causes, and suggest corrective actions. False positives are expensive — only confirm an anomaly when evidence is unambiguous.

Service: ${serviceId}

## Metrics Input
- HTTP Status Code: ${latestStatus ?? "unavailable"}
- Success Flag (probe_success): ${recentSuccess.at(-1)?.[1] ?? "unavailable"} (1 = success, 0 = failure)
- Response Time: ${stats.duration.latestValue.toFixed(4)}s
- SSL Enabled (probe_http_ssl): ${latestSsl ?? "unavailable"} (1 = yes, 0 = no)
- Response Size (probe_http_content_length): ${latestContentLength ?? "unavailable"} bytes

## Statistical Summary (probe_duration_seconds, last 10 min baseline)
- Baseline mean:   ${stats.duration.mean.toFixed(4)}s
- Baseline stddev: ${stats.duration.stddev.toFixed(4)}s
- Z-score:         ${stats.duration.zScore.toFixed(2)}σ  (alert threshold: 3.0σ)

## Rule-based flags (pre-computed by statistical detector)
- Service down (probe_success = 0 in 2+ of last 3 checks): ${downtimeDetected}
- Latency spike (z > 3.0σ AND > 2s for 2 consecutive points): ${latencySpikeDetected}

## Last 5 probe_success values [timestamp, value]:
${JSON.stringify(recentSuccess)}

## Last 5 probe_duration_seconds values [timestamp, value]:
${JSON.stringify(recentDuration)}

## Detection Rules
- If HTTP status >= 500 → severity HIGH
- If probe_success = 0 → anomaly = true
- If latency spikes significantly → severity HIGH
- If SSL = 0 when it should be enabled → root_cause: SSL misconfiguration
- If everything normal → anomaly = false

## Severity Classification
- LOW → minor degradation, service still functional
- MEDIUM → partial failure, some users affected
- HIGH → major outage, repeated failures, or status >= 500

## Corrective Actions
- restart_service: service crash or unresponsive
- rollback_deployment: recent deployment introduced issues
- scale_up_service: resource exhaustion or overload
- ignore: transient blip, single data point
- escalate_to_human: unknown cause or requires investigation

## Instructions
- Z-score below 2.5 is almost certainly noise → anomaly = false
- A single bad data point is NOT an anomaly — look for sustained patterns
- If data is sparse or service just started → anomaly = false
- Set confidence below 0.7 if you have any doubt
- Be conservative: prefer ignore or escalate_to_human over destructive actions
- Cross-check the rule-based flags against the raw metric values before confirming`;

  const { experimental_output: result } = await generateText({
    model,
    experimental_output: Output.object({ schema: anomalySchema }),
    prompt,
    abortSignal: AbortSignal.timeout(30_000),
  });

  return result;
}
