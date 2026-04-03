import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090/api/v1/query_range';
const METRIC_NAME = 'http_server_duration_milliseconds_count';
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'reports');

try {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn(`Could not create reports directory at ${REPORTS_DIR}. Attempting local ./reports`);
}

console.log(`👁️ Starting Continuous Anomaly Detection (TypeScript/AI SDK) on ${METRIC_NAME}...`);

let lastReportedTime: number | null = null;

const IncidentReportSchema = z.object({
  isAnomaly: z.boolean().describe("Whether a critical anomaly has been detected in the given timeframe"),
  incident_id: z.string().optional(),
  timestamp: z.string().optional(),
  failing_service: z.string().optional(),
  metric_analyzed: z.string().optional(),
  spike_value: z.number().optional(),
  status: z.string().optional(),
  suggested_action: z.string().optional()
});

async function checkAnomalies() {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - 3600; // Last 1 hour
  const step = '60s';

  try {
    const url = new URL(PROMETHEUS_URL);
    url.searchParams.append('query', METRIC_NAME);
    url.searchParams.append('start', startTime.toString());
    url.searchParams.append('end', endTime.toString());
    url.searchParams.append('step', step);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'success' || !data.data.result || data.data.result.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Waiting for traffic data...`);
      return;
    }

    const rawResults = data.data.result[0].values;

    let previousValue = 0;
    const rates: { time: number; rate: number }[] = rawResults.map((row: [number, string], index: number) => {
      const currentValue = parseFloat(row[1]);
      const rate = index === 0 ? 0 : currentValue - previousValue;
      previousValue = currentValue;
      return { time: row[0], rate };
    });

    const validRates = rates.slice(1);
    if (validRates.length === 0) return;

    const latestEvent = validRates[validRates.length - 1];

    const recentRates = validRates.slice(-10);
    const dataContext = recentRates.map(r => `Time: ${new Date(r.time * 1000).toISOString()}, Rate: ${r.rate}`).join('\n');

    const prompt = `Analyze the following time-series data representing HTTP server request counts per minute.
Look for any severe, unnatural spikes in the rate that signify an anomaly in the traffic. 
A rate consistently high might be normal, but a sudden massive spike (e.g. going from 0 to 100 in 1 minute) could be an anomaly.

Data:
${dataContext}

If an anomaly is detected in the most recent data points, return isAnomaly = true and fill out the rest of the incident report details. Set failing_service to 'buggy-payment-service'.`;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: IncidentReportSchema,
      prompt,
    });

    if (!object.isAnomaly) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ System healthy. Rate: ${latestEvent.rate} req/min`);
    } else {
      const latestEventTimeMs = latestEvent.time * 1000;

      if (lastReportedTime !== latestEventTimeMs) {
        const latestEventDate = new Date(latestEventTimeMs);
        const timestampStr = latestEventDate.toISOString().replace(/[-:T]/g, '').slice(0, 15);
        const reportFilename = `incident_${timestampStr}.json`;
        const reportPath = path.join(REPORTS_DIR, reportFilename);

        console.log(`🚨 NEW ANOMALY DETECTED! Saving ${reportFilename}...`);

        const incidentReport = {
          incident_id: object.incident_id || `INC-${timestampStr}`,
          timestamp: latestEventDate.toISOString(),
          failing_service: object.failing_service || "buggy-payment-service",
          metric_analyzed: METRIC_NAME,
          spike_value: object.spike_value || latestEvent.rate,
          status: object.status || "CRITICAL",
          suggested_action: object.suggested_action || "Analyze source code for blocking operations or leaks."
        };

        fs.writeFileSync(reportPath, JSON.stringify(incidentReport, null, 4));
        lastReportedTime = latestEventTimeMs;
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Anomaly ongoing, but already reported.`);
      }
    }
  } catch (error) {
    console.error(`Error checking anomalies:`, error);
  }
}

async function main() {
  while (true) {
    await checkAnomalies();
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

main();
