import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('[Redis Core] Connection error:', err);
});

export { connection };
