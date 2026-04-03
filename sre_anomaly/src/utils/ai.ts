import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const anomalySchema = z.object({
  isAnomaly: z.boolean().describe("Whether an anomaly is detected based on the metrics"),
  reason: z.string().describe("Detailed explanation of why this is considered an anomaly or not"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Severity class of the anomaly if present"),
  suggested_action: z.string().describe("Actionable advice to resolve the anomaly"),
});

export type AIAnomalyResult = z.infer<typeof anomalySchema>;

export async function analyzeMetrics(
  serviceId: string,
  downtimeDetected: boolean,
  latencySpikeDetected: boolean,
  dataPointsConfig: { durationSeconds: [number, number][], success: [number, number][] }
): Promise<AIAnomalyResult> {
  const model = openrouter.chat('google/gemma-4-31b-it');

  const prompt = `
You are an expert Site Reliability Engineer analyzing Prometheus metrics for a service.
Service ID: ${serviceId}
Rule-based preliminary checks detected:
- Downtime (probe_success == 0): ${downtimeDetected}
- Latency Spike (> average * 2.5): ${latencySpikeDetected}

Last 10 data points for probe_success (timestamp, value):
${JSON.stringify(dataPointsConfig.success)}

Last 10 data points for probe_duration_seconds (timestamp, value):
${JSON.stringify(dataPointsConfig.durationSeconds)}

Analyze these metrics. Provide a JSON response indicating if there's an anomaly, a clear reason, severity, and suggested action.
`;

  try {
    const { object } = await generateObject({
      model,
      schema: anomalySchema,
      prompt,
      // Give AI maximum 15 seconds to reply
      abortSignal: AbortSignal.timeout(15000), 
    });

    return object;
  } catch (error) {
    console.error("[AI] Error generating analysis:", error);
    throw error;
  }
}
