import app from './app.js';
import { env } from './config/env.js';
import {
  isRedisQueueEnabled,
  processPendingSyncJobs,
  startRedisSyncWorker,
} from './services/sheetSyncQueueService.js';

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${env.port}`);
});

if (isRedisQueueEnabled()) {
  startRedisSyncWorker();
} else {
  const runSyncWorker = async () => {
    try {
      const result = await processPendingSyncJobs({
        limit: env.sheetSyncBatchSize,
        retryDelayMinutes: env.sheetSyncRetryDelayMinutes,
      });

      if (result.processed > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `Sheet sync worker processed=${result.processed} success=${result.success} failed=${result.failed}`,
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sheet sync worker failed', error.message);
    }
  };

  runSyncWorker();
  setInterval(runSyncWorker, env.sheetSyncRetryIntervalSeconds * 1000);
}
