import prisma from '../../lib/db';
import { fetchPrometheusMetrics } from '../utils/prometheus';
import { analyzeMetrics, type MetricStats } from '../utils/ai';

function computeStats(values: number[]): { mean: number; stddev: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, stddev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return { mean, stddev: Math.sqrt(variance) };
}

function zScore(value: number, mean: number, stddev: number): number {
  return stddev === 0 ? 0 : (value - mean) / stddev;
}

export async function checkServiceForAnomalies(serviceId: string) {
  try {
    const [successPoints, durationPoints, statusCodePoints, sslPoints, contentLengthPoints] =
      await Promise.all([
        fetchPrometheusMetrics(serviceId, 'probe_success'),
        fetchPrometheusMetrics(serviceId, 'probe_duration_seconds'),
        fetchPrometheusMetrics(serviceId, 'probe_http_status_code'),
        fetchPrometheusMetrics(serviceId, 'probe_http_ssl'),
        fetchPrometheusMetrics(serviceId, 'probe_http_content_length'),
      ]);

    if (successPoints.length < 5 && durationPoints.length < 5) {
      console.log(`[Anomaly] Insufficient data for ${serviceId}. Skipping.`);
      return;
    }

    // ── 1. DOWNTIME: 2 of last 3 probe_success = 0 ───────────────────────────
    const last3Success = successPoints.slice(-3).map(p => p[1]);
    const downCount = last3Success.filter(v => v === 0).length;
    const isDown = downCount >= 2;

    // ── 2. HTTP STATUS >= 500 ─────────────────────────────────────────────────
    const latestStatus = statusCodePoints.at(-1)?.[1] ?? null;
    const isServerError = latestStatus !== null && latestStatus >= 500;

    // ── 3. LATENCY SPIKE: 3-sigma Z-score on last 2 consecutive points ────────
    let isLatencySpiked = false;
    let durationStats: MetricStats = { mean: 0, stddev: 0, zScore: 0, latestValue: 0 };

    if (durationPoints.length >= 10) {
      const baselineValues = durationPoints.slice(0, -2).map(p => p[1]);
      const last2 = durationPoints.slice(-2).map(p => p[1]);
      const { mean, stddev } = computeStats(baselineValues);
      const latestValue = last2[last2.length - 1]!;
      const z = zScore(latestValue, mean, stddev);
      durationStats = { mean, stddev, zScore: z, latestValue };
      const bothSpike = last2.every(v => zScore(v, mean, stddev) > 3.0 && v > 2.0);
      isLatencySpiked = bothSpike && mean >= 0.05;
    }

    // ── 4. EARLY EXIT ──────────────────────────────────────────────────────────
    if (!isDown && !isLatencySpiked && !isServerError) {
      console.log(`[Anomaly] ${serviceId} is normal.`);
      return;
    }

    console.log(
      `[Anomaly] Rule-based signal for ${serviceId} — ` +
      `down=${isDown} (${downCount}/3), spike=${isLatencySpiked} (z=${durationStats.zScore.toFixed(2)}σ), ` +
      `http_status=${latestStatus}`
    );

    // ── 5. COOLDOWN ───────────────────────────────────────────────────────────
    const recentIncident = await prisma.incident.findFirst({
      where: { serviceId, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    if (recentIncident) {
      console.log(`[Anomaly] Cooldown active for ${serviceId}. Skipping.`);
      return;
    }

    // ── 6. AI CONFIRMATION ────────────────────────────────────────────────────
    let aiResult;
    try {
      aiResult = await analyzeMetrics(
        serviceId,
        isDown,
        isLatencySpiked,
        {
          durationSeconds: durationPoints,
          success: successPoints,
          httpStatusCode: statusCodePoints,
          httpSsl: sslPoints,
          httpContentLength: contentLengthPoints,
        },
        { duration: durationStats },
      );
    } catch (err) {
      console.error(`[AI] Unavailable for ${serviceId}. Skipping incident creation.`, err);
      return;
    }

    if (!aiResult.anomaly) {
      console.log(`[AI] Not an anomaly for ${serviceId}: ${aiResult.reason}`);
      return;
    }

    if (aiResult.confidence < 0.7) {
      console.log(
        `[AI] Low confidence (${(aiResult.confidence * 100).toFixed(0)}%) for ${serviceId}. ` +
        `Not creating incident. Reason: ${aiResult.reason}`
      );
      return;
    }

    console.log(
      `[Anomaly] CONFIRMED [${aiResult.severity}] confidence=${(aiResult.confidence * 100).toFixed(0)}% ` +
      `for ${serviceId}: ${aiResult.reason}`
    );

    // ── 7. CREATE INCIDENT ────────────────────────────────────────────────────
    const incident = await prisma.incident.create({
      data: {
        title: `Anomaly: ${isDown ? 'Downtime' : isServerError ? `HTTP ${latestStatus}` : 'Latency Spike'}`,
        description: aiResult.reason,
        type: isDown ? 'downtime' : isServerError ? 'http_error' : 'latency',
        severity: aiResult.severity,
        details: {
          recommended_action: aiResult.recommended_action,
          root_cause: aiResult.root_cause,
          ai_confidence: aiResult.confidence,
          z_score: durationStats.zScore,
          baseline_mean_s: durationStats.mean,
          baseline_stddev_s: durationStats.stddev,
          http_status_code: latestStatus,
        },
        serviceId,
        patchStatus: 'PENDING',
      },
    });

    const patcherUrl = process.env.PATCHER_URL ?? 'http://localhost:4000';
    fetch(`${patcherUrl}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: incident.id }),
    }).catch((err) => console.error('[Patcher] Trigger failed:', err));

    // ── 8. LOG RAW METRICS ────────────────────────────────────────────────────
    await prisma.anomalyLog.create({
      data: {
        metric: isDown ? 'probe_success' : isServerError ? 'probe_http_status_code' : 'probe_duration_seconds',
        value: durationStats.latestValue || null,
        raw_data: {
          probe_success: successPoints.slice(-5),
          probe_duration_seconds: durationPoints.slice(-5),
          probe_http_status_code: statusCodePoints.slice(-5),
          probe_http_ssl: sslPoints.slice(-5),
          probe_http_content_length: contentLengthPoints.slice(-5),
          stats: durationStats as unknown as Record<string, number>,
        },
        serviceId,
      },
    });

  } catch (error) {
    console.error(`[Anomaly] Pipeline error for ${serviceId}:`, error);
    throw error;
  }
}
