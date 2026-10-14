import type { RedisOptions } from "ioredis";

/** BullMQ connection options. `REDIS_URL` overrides the host/port settings. */
export function getRedisConnection(): RedisOptions {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return connectionFromUrl(redisUrl);
  }

  const tls = process.env.REDIS_TLS === "true";
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;

  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    maxRetriesPerRequest: null,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    // Upstash hostnames often resolve to IPv6, which ioredis can hang on.
    ...(tls ? { tls: {}, family: 4 } : {}),
  };
}

function connectionFromUrl(redisUrl: string): RedisOptions {
  const parsed = new URL(redisUrl);
  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    maxRetriesPerRequest: null,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    // `rediss://` is TLS. Upstash hostnames often resolve to IPv6, which ioredis can hang on.
    ...(parsed.protocol === "rediss:" ? { tls: {}, family: 4 } : {}),
  };
}
