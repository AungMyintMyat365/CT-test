import IORedis from 'ioredis';
import { env } from '../config/env.js';

let redisClient = null;

const buildRedisOptions = () => {
  if (!env.redisUrl) return null;

  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };

  const wantsTls = env.redisTls || String(env.redisUrl).startsWith('rediss://');
  if (wantsTls) {
    options.tls = {};
  }

  return options;
};

export const getRedis = () => {
  if (!env.redisUrl) return null;
  if (redisClient) return redisClient;

  const options = buildRedisOptions();
  redisClient = new IORedis(env.redisUrl, options || undefined);
  return redisClient;
};

export const isRedisEnabled = () => Boolean(env.redisUrl);
