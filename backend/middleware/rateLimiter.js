import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { env } from '../config/env.js';
import { getRedis } from '../services/redisClient.js';

const buildRedisStore = () => {
  const redis = getRedis();
  if (!redis) return undefined;

  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  });
};

export const authRateLimiter = rateLimit({
  windowMs: env.redisRateLimitWindowSeconds * 1000,
  max: env.redisRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildRedisStore(),
  message: { message: 'Too many login attempts. Please try again later.' },
});
