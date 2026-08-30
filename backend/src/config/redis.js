import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 2,
  lazyConnect: false,
  retryStrategy(times) {
    if (times > 3) {
      // Stop retrying after a few attempts — Redis is optional (caching
      // only), so give up quietly rather than spamming reconnect attempts
      // forever when it's simply not installed/running.
      return null;
    }
    return Math.min(times * 200, 1000);
  },
});

let hasLoggedRedisUnavailable = false;

redis.on('error', (err) => {
  // Don't crash the app if Redis is temporarily down — search should degrade
  // to "always hit the provider" rather than fail outright. Only log once
  // to avoid flooding the console with repeated connection-refused errors.
  if (!hasLoggedRedisUnavailable) {
    hasLoggedRedisUnavailable = true;
    console.warn(
      `[redis] not available (${err.code || err.message || 'connection failed'}) — ` +
        'caching disabled, search will always hit the live provider. This is fine for development.'
    );
  }
});

const DEFAULT_TTL_SECONDS = 60 * 15; // 15 min — search results go stale fast enough to warrant a short cache

export async function cacheGet(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // cache is an optimization, never a hard dependency
  }
}

export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // swallow — see note above
  }
}

export function buildSearchCacheKey(params) {
  // Stable key regardless of object key order
  const sorted = Object.keys(params).sort().reduce((acc, k) => {
    acc[k] = params[k];
    return acc;
  }, {});
  return `search:${JSON.stringify(sorted)}`;
}
