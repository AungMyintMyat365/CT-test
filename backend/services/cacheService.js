import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getRedis } from './redisClient.js';

const memoryStore = new Map();
let memoryVersion = 1;

const CACHE_VERSION_KEY = `${env.redisPrefix}:cache:version`;

const getMemoryEntry = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const setMemoryEntry = (key, value, ttlSeconds) => {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value, expiresAt });
};

const getCacheVersion = async () => {
  const redis = getRedis();
  if (!redis) return memoryVersion;

  let version = await redis.get(CACHE_VERSION_KEY);
  if (!version) {
    await redis.set(CACHE_VERSION_KEY, '1');
    version = '1';
  }
  return Number(version);
};

export const bumpCacheVersion = async () => {
  const redis = getRedis();
  if (!redis) {
    memoryVersion += 1;
    return memoryVersion;
  }

  const next = await redis.incr(CACHE_VERSION_KEY);
  return Number(next);
};

const buildCacheKey = async ({ namespace, identity, params }) => {
  const version = await getCacheVersion();
  const raw = JSON.stringify({ namespace, identity, params });
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return `${env.redisPrefix}:v${version}:${namespace}:${digest}`;
};

export const withCache = async ({
  namespace,
  identity,
  params,
  ttlSeconds = env.redisCacheTtlSeconds,
  compute,
}) => {
  if (!ttlSeconds || ttlSeconds <= 0) {
    return compute();
  }

  const key = await buildCacheKey({ namespace, identity, params });
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } else {
    const cached = getMemoryEntry(key);
    if (cached) return cached;
  }

  const value = await compute();

  if (redis) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } else {
    setMemoryEntry(key, value, ttlSeconds);
  }

  return value;
};
