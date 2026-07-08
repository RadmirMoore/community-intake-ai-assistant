/**
 * Minimal in-memory sliding-window rate limiter for the public intake endpoint.
 * Each accepted intake triggers a paid Anthropic API call, so unlimited
 * anonymous POSTs would let a bot burn the API budget.
 *
 * In-memory state is per-process: good enough for a single server or a demo.
 * On serverless/multi-instance deployments move this to a shared store
 * (e.g. Upstash Redis) — the call sites only depend on this function.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 10_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window (only set when blocked). */
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  clientId: string,
  max: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_MS,
): RateLimitResult {
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

/** Best-effort client identifier: first hop of X-Forwarded-For, else "unknown". */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Test-only helper. */
export function resetRateLimiter(): void {
  hits.clear();
}
