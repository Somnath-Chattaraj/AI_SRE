import { Worker, Job } from 'bullmq';
import { connection } from '../queue/connection';
import { checkServiceForAnomalies } from '../services/anomaly.service';

export const startWorker = () => {
  console.log('[Worker] Starting instance for queue "anomaly-detection"');

  const worker = new Worker(
    'anomaly-detection',
    async (job: Job) => {
      const { serviceId, userId } = job.data;
      console.log(`[Worker] Processing job ${job.id} for service ${serviceId}`);

      try {
        await checkServiceForAnomalies(serviceId);
        console.log(`[Worker] Finished job ${job.id} for service ${serviceId}`);
      } catch (err) {
        console.error(`[Worker] Job ${job.id} failed.`, err);
        throw err; 
      }
    },
    {
      connection,
      concurrency: 10, 
    }
  );

  worker.on('completed', (job) => {
    
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] Gracefully shutting down worker...');
    await worker.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('[Worker] Gracefully shutting down worker...');
    await worker.close();
    process.exit(0);
  });

  return worker;
};

if (require.main === module) {
  startWorker();
}
