import { anomalyQueue } from './queue/producer';
import prisma from '../lib/db';

async function runExample() {
  console.log('[Example] Seeding temp user and service...');
  
  
  const user = await prisma.user.create({
    data: {
      apiKey: `test-api-key-${Date.now()}`
    }
  });

  const service = await prisma.service.create({
    data: {
      name: 'Test Target Service',
      url_server: 'http://example.com',
      userId: user.id
    }
  });

  console.log(`[Example] Created dummy service ${service.id}. Enqueuing sample check...`);

  
  await anomalyQueue.add('check-service-anomaly', {
    serviceId: service.id,
    userId: user.id,
  }, {
    jobId: `test-demo-${Date.now()}`
  });

  console.log('[Example] Job enqueued! Start the worker to process it: bun run src/worker/worker.ts');
  
  
  setTimeout(() => process.exit(0), 1000);
}

if (require.main === module) {
  runExample();
}
