import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// ✅ setup openrouter
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const PROMETHEUS_URL =
  process.env.PROMETHEUS_URL ||
  'http://prometheus:9090/api/v1/query_range';

const METRIC_NAME = 'http_server_duration_milliseconds_count';
const REPORTS_DIR =
  process.env.REPORTS_DIR || path.join(process.cwd(), 'reports');

// ensure reports dir exists
try {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn(
    `Could not create reports directory at ${REPORTS_DIR}. Attempting local ./reports`,
  );
}

console.log(
  `👁️ Starting Continuous Anomaly Detection (OpenRouter/Gemma) on ${METRIC_NAME}...`,
);

let lastReportedTime: number | null = null;

// schema
const IncidentReportSchema = z.object({
  isAnomaly: z.boolean(),
  incident_id: z.string().optional(),
  timestamp: z.string().optional(),
  failing_service: z.string().optional(),
  metric_analyzed: z.string().optional(),
  spike_value: z.number().optional(),
  status: z.string().optional(),
  suggested_action: z.string().optional(),
});

async function checkAnomalies() {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - 3600; // last 1 hour
  const step = '60s';

  try {
    const url = new URL(PROMETHEUS_URL);
    url.searchParams.append('query', METRIC_NAME);
    url.searchParams.append('start', startTime.toString());
    url.searchParams.append('end', endTime.toString());
    url.searchParams.append('step', step);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (
      data.status !== 'success' ||
      !data.data.result ||
      data.data.result.length === 0
    ) {
      console.log(
        `[${new Date().toLocaleTimeString()}] Waiting for traffic data...`,
      );
      return;
    }

    const rawResults = data.data.result[0].values;

    let previousValue = 0;
    const rates: { time: number; rate: number }[] = rawResults.map(
      (row: [number, string], index: number) => {
        const currentValue = parseFloat(row[1]);
        const rate = index === 0 ? 0 : currentValue - previousValue;
        previousValue = currentValue;
        return { time: row[0], rate };
      },
    );

    const validRates = rates.slice(1);
    if (validRates.length === 0) return;

    const latestEvent = validRates[validRates.length - 1];

    const recentRates = validRates.slice(-10);
    const dataContext = recentRates
      .map(
        (r) =>
          `Time: ${new Date(r.time * 1000).toISOString()}, Rate: ${r.rate}`,
      )
      .join('\n');

    const prompt = `Analyze the following time-series data representing HTTP server request counts per minute.
Look for severe unnatural spikes.

Data:
${dataContext}

Rules:
- Sudden jump = anomaly
- Gradual increase = normal
- Ignore noise

If anomaly detected:
- isAnomaly = true
- failing_service = 'buggy-payment-service'

Return structured JSON.`;

    // ✅ optional timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const { object } = await generateObject({
      model: openrouter('qwen/qwen3.6-plus:free'),
      schema: IncidentReportSchema,
      prompt,
      temperature: 0, // ✅ important for stability
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!object.isAnomaly) {
      console.log(
        `[${new Date().toLocaleTimeString()}] ✅ System healthy. Rate: ${latestEvent.rate} req/min`,
      );
    } else {
      const latestEventTimeMs = latestEvent.time * 1000;

      if (lastReportedTime !== latestEventTimeMs) {
        const latestEventDate = new Date(latestEventTimeMs);
        const timestampStr = latestEventDate
          .toISOString()
          .replace(/[-:T]/g, '')
          .slice(0, 15);

        const reportFilename = `incident_${timestampStr}.json`;
        const reportPath = path.join(REPORTS_DIR, reportFilename);

        console.log(
          `🚨 NEW ANOMALY DETECTED! Saving ${reportFilename}...`,
        );

        const incidentReport = {
          incident_id:
            object.incident_id || `INC-${timestampStr}`,
          timestamp: latestEventDate.toISOString(),
          failing_service:
            object.failing_service || 'buggy-payment-service',
          metric_analyzed: METRIC_NAME,
          spike_value:
            object.spike_value || latestEvent.rate,
          status: object.status || 'CRITICAL',
          suggested_action:
            object.suggested_action ||
            'Analyze source code for blocking operations or leaks.',
        };

        fs.writeFileSync(
          reportPath,
          JSON.stringify(incidentReport, null, 4),
        );

        lastReportedTime = latestEventTimeMs;
      } else {
        console.log(
          `[${new Date().toLocaleTimeString()}] ⚠️ Anomaly ongoing, already reported.`,
        );
      }
    }
  } catch (error) {
    console.error(`Error checking anomalies:`, error);
  }
}

async function main() {
  while (true) {
    await checkAnomalies();
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}

main();