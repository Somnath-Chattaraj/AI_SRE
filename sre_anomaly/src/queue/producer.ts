import { Queue } from 'bullmq';
import { connection } from './connection';
import prisma from '../../lib/db';

export const anomalyQueue = new Queue('anomaly-detection', { connection });

export async function scheduleAnomalyChecks() {
  console.log('[Producer] Scheduler started. Checking for services...');

  setInterval(async () => {
    try {
      const services = await prisma.service.findMany({
        select: { id: true, userId: true },
      });

      console.log(`[Producer] Found ${services.length} services to check. Enqueueing jobs...`);

      const jobs = services.map((service) => ({
        name: 'check-service-anomaly',
        data: {
          serviceId: service.id,
          userId: service.userId,
        },
        opts: {
          jobId: `anomaly-${service.id}-${Math.floor(Date.now() / 15000)}`, 
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, 
          },
        },
      }));

      await anomalyQueue.addBulk(jobs);

    } catch (error) {
      console.error('[Producer] Error adding jobs to queue:', error);
    }
  }, 15000); 
}

if (require.main === module) {
  scheduleAnomalyChecks();
}
