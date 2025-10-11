type Bucket = {
  tokens: number;
  lastRefill: number;
};

declare global {
  var __rate_buckets: Map<string, Bucket> | undefined;
}

// Global token buckets per identifier (best-effort on Edge; per-instance only)
const buckets: Map<string, Bucket> = globalThis.__rate_buckets || new Map<string, Bucket>();
globalThis.__rate_buckets = buckets;

/**
 * Simple token bucket rate limiter.
 * @param id unique client identifier (e.g., IP)
 * @param limit tokens per interval
 * @param intervalMs interval in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(id: string, limit: number, intervalMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(id) || { tokens: limit, lastRefill: now };

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / intervalMs) * limit;
    bucket.tokens = Math.min(limit, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(id, bucket);
    return true;
  }

  buckets.set(id, bucket);
  return false;
}

/**
 * Extract a best-effort client identifier (IP) from the request.
 */
export function getClientId(req: Request): string {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0]?.trim() || 'unknown';
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
