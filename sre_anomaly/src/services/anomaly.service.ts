import prisma from '../../lib/db';
import { fetchPrometheusMetrics } from '../utils/prometheus';
import { analyzeMetrics, type MetricStats } from '../utils/ai';

// ─── Statistical helpers (3-sigma / Z-score — standard SRE approach) ──────────

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

// ─── Detection ────────────────────────────────────────────────────────────────

export async function checkServiceForAnomalies(serviceId: string) {
  try {
    // 10-minute window → ~40 points at 15s step → robust statistical baseline
    const successPoints = await fetchPrometheusMetrics(serviceId, 'probe_success');
    const durationPoints = await fetchPrometheusMetrics(serviceId, 'probe_duration_seconds');

    if (successPoints.length < 5 && durationPoints.length < 5) {
      console.log(`[Anomaly] Insufficient data for ${serviceId}. Skipping.`);
      return;
    }

    // ── 1. DOWNTIME: require 2 of last 3 probe_success values = 0 ─────────────
    //    A single missed probe is transient noise. Two is a real outage.
    const last3Success = successPoints.slice(-3).map(p => p[1]);
    const downCount = last3Success.filter(v => v === 0).length;
    const isDown = downCount >= 2;

    // ── 2. LATENCY SPIKE: 3-sigma Z-score on last 2 consecutive points ────────
    //    Baseline = all but last 2 points (need >= 10 for meaningful stats)
    let isLatencySpiked = false;
    let durationStats: MetricStats = { mean: 0, stddev: 0, zScore: 0, latestValue: 0 };

    if (durationPoints.length >= 10) {
      const baselineValues = durationPoints.slice(0, -2).map(p => p[1]);
      const last2 = durationPoints.slice(-2).map(p => p[1]);
      const { mean, stddev } = computeStats(baselineValues);
      const latestValue = last2[last2.length - 1]!;
      const z = zScore(latestValue, mean, stddev);

      durationStats = { mean, stddev, zScore: z, latestValue };

      // Both of the last 2 points must exceed 3σ AND be above 2s absolute
      const bothSpike = last2.every(v => zScore(v, mean, stddev) > 3.0 && v > 2.0);
      isLatencySpiked = bothSpike && mean >= 0.05; // ignore near-zero baselines
    }

    // ── 3. EARLY EXIT ──────────────────────────────────────────────────────────
    if (!isDown && !isLatencySpiked) {
      console.log(`[Anomaly] ${serviceId} is normal.`);
      return;
    }

    console.log(
      `[Anomaly] Rule-based signal for ${serviceId} — ` +
      `down=${isDown} (${downCount}/3), spike=${isLatencySpiked} (z=${durationStats.zScore.toFixed(2)}σ)`
    );

    // ── 4. COOLDOWN: skip if incident created in last 5 min ───────────────────
    const recentIncident = await prisma.incident.findFirst({
      where: {
        serviceId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    if (recentIncident) {
      console.log(`[Anomaly] Cooldown active for ${serviceId}. Skipping.`);
      return;
    }

    // ── 5. AI CONFIRMATION ────────────────────────────────────────────────────
    //    AI acts as a second opinion with full statistical context.
    //    If AI fails or is not confident (< 70), we abort — no incident.
    //    This is the primary guard against false positives.
    let aiResult;
    try {
      aiResult = await analyzeMetrics(
        serviceId,
        isDown,
        isLatencySpiked,
        { durationSeconds: durationPoints, success: successPoints },
        { duration: durationStats },
      );
    } catch (err) {
      // AI is unavailable — log and exit. The next poll (15s) will re-evaluate.
      // Better to miss one cycle than to flood the incident tracker with noise.
      console.error(`[AI] Unavailable for ${serviceId}. Skipping incident creation.`, err);
      return;
    }

    if (!aiResult.isAnomaly) {
      console.log(`[AI] Not an anomaly for ${serviceId}: ${aiResult.reason}`);
      return;
    }

    if (aiResult.confidence < 70) {
      console.log(
        `[AI] Low confidence (${aiResult.confidence}%) for ${serviceId}. ` +
        `Not creating incident. Reason: ${aiResult.reason}`
      );
      return;
    }

    console.log(
      `[Anomaly] CONFIRMED [${aiResult.severity}] confidence=${aiResult.confidence}% ` +
      `for ${serviceId}: ${aiResult.reason}`
    );

    // ── 6. CREATE INCIDENT ────────────────────────────────────────────────────
    const incident = await prisma.incident.create({
      data: {
        title: `Anomaly: ${isDown ? 'Downtime' : 'Latency Spike'}`,
        description: aiResult.reason,
        type: isDown ? 'downtime' : 'latency',
        severity: aiResult.severity,
        details: {
          suggested_action: aiResult.suggested_action,
          ai_confidence: aiResult.confidence,
          z_score: durationStats.zScore,
          baseline_mean_s: durationStats.mean,
          baseline_stddev_s: durationStats.stddev,
        },
        serviceId,
        patchStatus: 'PENDING',
      },
    });

    // Trigger auto-patcher (fire-and-forget)
    const patcherUrl = process.env.PATCHER_URL ?? 'http://localhost:4000';
    fetch(`${patcherUrl}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: incident.id }),
    }).catch((err) => console.error('[Patcher] Trigger failed:', err));

    // ── 7. LOG RAW METRICS ────────────────────────────────────────────────────
    await prisma.anomalyLog.create({
      data: {
        metric: isDown ? 'probe_success' : 'probe_duration_seconds',
        value: durationStats.latestValue || null,
        raw_data: {
          probe_success: successPoints.slice(-5),
          probe_duration_seconds: durationPoints.slice(-5),
          stats: durationStats as unknown as Record<string, number>,
        },
        serviceId,
      },
    });

  } catch (error) {
    console.error(`[Anomaly] Pipeline error for ${serviceId}:`, error);
    throw error; // let BullMQ retry
  }
}
