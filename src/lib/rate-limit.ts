/**
 * Sliding-window rate limiter for the public intake endpoint. Each accepted
 * intake triggers a paid Anthropic API call, so unlimited anonymous POSTs
 * would let a bot burn the API budget.
 *
 * Backed by an in-memory map by default (good enough for a single server or a
 * demo, but per-process — it won't coordinate across serverless instances).
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to switch to a
 * shared Upstash Redis-backed limiter instead, the same way storage picks
 * Supabase vs. a local JSON file (see src/lib/storage/index.ts).
 */

import { Redis } from "@upstash/redis";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window (only set when blocked). */
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  clientId: string,
  max: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_MS,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  return redis
    ? redisRateLimit(redis, clientId, max, windowMs)
    : memoryRateLimit(clientId, max, windowMs);
}

// ---- In-memory backend (default, zero configuration) ----------------------

const MAX_TRACKED_CLIENTS = 10_000;
const hits = new Map<string, number[]>();

function memoryRateLimit(clientId: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(clientId) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(clientId, recent);
    const retryAfterSeconds = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(clientId, recent);
  pruneIfNeeded(now, windowMs);
  return { allowed: true };
}

function pruneIfNeeded(now: number, windowMs: number): void {
  if (hits.size <= MAX_TRACKED_CLIENTS) return;
  for (const [key, times] of hits) {
    if (times.every((t) => now - t >= windowMs)) hits.delete(key);
  }
}

// ---- Upstash Redis backend (optional, shared across instances) ------------

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

async function redisRateLimit(
  redis: Redis,
  clientId: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = `rate-limit:${clientId}`;
  const now = Date.now();

  // Sliding window via a sorted set: score = hit timestamp. Drop hits that
  // have already fallen outside the window before counting.
  await redis.zremrangebyscore(key, 0, now - windowMs);
  const count = await redis.zcard(key);

  if (count >= max) {
    // The key's TTL approximates when the window frees up; good enough for a
    // Retry-After hint without an extra round-trip to read the oldest score.
    const ttlMs = await redis.pttl(key);
    const retryAfterSeconds = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  await redis.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2)}` });
  await redis.pexpire(key, windowMs);
  return { allowed: true };
}

/** Best-effort client identifier: first hop of X-Forwarded-For, else "unknown". */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Test-only helper. */
export function resetRateLimiter(): void {
  hits.clear();
}
