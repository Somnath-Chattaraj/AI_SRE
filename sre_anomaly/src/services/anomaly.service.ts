import prisma from '../../lib/db';
import { fetchPrometheusMetrics } from '../utils/prometheus';
import { analyzeMetrics } from '../utils/ai';

export async function checkServiceForAnomalies(serviceId: string) {
  try {
    const successPoints = await fetchPrometheusMetrics(serviceId, 'probe_success');
    const durationPoints = await fetchPrometheusMetrics(serviceId, 'probe_duration_seconds');

    if (!successPoints.length && !durationPoints.length) {
      console.log(`[Anomaly] No metrics found for service ${serviceId}. Skipping.`);
      return;
    }

    console.log(`[Metrics] ${serviceId} Success:`, JSON.stringify(successPoints));
    console.log(`[Metrics] ${serviceId} Duration:`, JSON.stringify(durationPoints));

    // -------------------------------
    // 1️⃣ RULE-BASED DETECTION
    // -------------------------------

    const latestSuccess = successPoints.length > 0
      ? successPoints[successPoints.length - 1]![1]
      : 1;

    const isDown = latestSuccess === 0;

    let isLatencySpiked = false;

    if (durationPoints.length >= 6) {
      const latestDuration = durationPoints[durationPoints.length - 1]![1];
      const previousDurations = durationPoints.slice(0, -1).map(p => p[1]);

      // 🔹 Trim extremes (remove min & max)
      const sorted = [...previousDurations].sort((a, b) => a - b);
      const trimmed = sorted.slice(1, -1);

      const avgDuration =
        trimmed.reduce((a, b) => a + b, 0) / (trimmed.length || 1);

      // 🔹 Avoid noise when baseline is too low
      if (avgDuration >= 0.2) {
        const deviation =
          avgDuration > 0 ? (latestDuration - avgDuration) / avgDuration : 0;

        isLatencySpiked =
          latestDuration > 1 &&       // absolute threshold (1s)
          deviation > 1.5 &&          // 150% spike
          previousDurations.length >= 5;
      }
    }

    // -------------------------------
    // 2️⃣ EARLY EXIT (NORMAL CASE)
    // -------------------------------

    if (!isDown && !isLatencySpiked) {
      console.log(`[Anomaly] Service ${serviceId} is normal.`);
      return;
    }

    console.log(
      `[Anomaly] Rule-based anomaly detected for ${serviceId} (down=${isDown}, spike=${isLatencySpiked})`
    );

    // -------------------------------
    // 3️⃣ COOLDOWN (PREVENT SPAM)
    // -------------------------------

    const recentIncident = await prisma.incident.findFirst({
      where: {
        serviceId,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // last 5 minutes
        },
      },
    });

    if (recentIncident) {
      console.log(`[Anomaly] Skipping duplicate alert for ${serviceId}`);
      return;
    }

    // -------------------------------
    // 4️⃣ AI ANALYSIS
    // -------------------------------

    let aiResult;

    try {
      aiResult = await analyzeMetrics(serviceId, isDown, isLatencySpiked, {
        durationSeconds: durationPoints,
        success: successPoints,
      });
    } catch (err) {
      console.error(`[AI] Failed for ${serviceId}, using fallback`, err);

      aiResult = {
        isAnomaly: true,
        reason: isDown
          ? 'Service is down (probe_success = 0)'
          : 'Latency significantly higher than baseline',
        severity: isDown ? 'CRITICAL' : 'HIGH',
        suggested_action:
          'Check logs, upstream dependencies, and resource usage',
      };
    }

    if (!aiResult.isAnomaly) {
      console.log(`[AI] False alarm for ${serviceId}`);
      return;
    }

    console.log(
      `[Anomaly] CONFIRMED [${aiResult.severity}] for ${serviceId}: ${aiResult.reason}`
    );

    // -------------------------------
    // 5️⃣ SAVE INCIDENT
    // -------------------------------

    await prisma.incident.create({
      data: {
        title: `Anomaly: ${isDown ? 'Downtime' : 'Latency Spike'}`,
        description: aiResult.reason,
        type: isDown ? 'downtime' : 'latency',
        severity: aiResult.severity,
        details: {
          suggested_action: aiResult.suggested_action,
          ai_raw_metadata: aiResult,
        },
        serviceId,
      },
    });

    // -------------------------------
    // 6️⃣ SAVE RAW METRICS
    // -------------------------------

    await prisma.anomalyLog.create({
      data: {
        metric: isDown ? 'probe_success' : 'probe_duration_seconds',
        value: null,
        raw_data: {
          probe_success: successPoints,
          probe_duration_seconds: durationPoints,
        },
        serviceId,
      },
    });

  } catch (error) {
    console.error(`[Anomaly] Pipeline error for ${serviceId}:`, error);
    throw error; // let BullMQ retry
  }
}