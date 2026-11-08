import type { VercelRequest, VercelResponse } from '@vercel/node';

const WINDOW_MS = 60_000;
// Overridable only so the local e2e suite (one IP, many POSTs) is not throttled;
// production leaves it unset and gets the default.
const configuredMax = Number.parseInt(process.env.RATE_LIMIT_MAX_PER_MINUTE ?? '', 10);
const MAX_REQUESTS_PER_WINDOW = Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : 20;
const MAX_TRACKED_KEYS = 5_000;

// Best-effort abuse brake only. State lives in this module's memory, so it is
// per warm serverless instance: it resets on cold start and is not shared
// across instances or regions. It is not a substitute for a shared limiter
// (e.g. an edge/WAF rule or a database-backed counter).
const hits = new Map<string, number[]>();

export function clientKey(req: VercelRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) {
        hits.delete(k);
      }
    }
  }

  return false;
}

/** Returns true (and sends 429) when the caller exceeded the limit. */
export function rejectIfRateLimited(req: VercelRequest, res: VercelResponse): boolean {
  if (!isRateLimited(clientKey(req))) {
    return false;
  }

  res.setHeader('Retry-After', String(WINDOW_MS / 1000));
  res.status(429).json({ error: 'Too many requests, please try again shortly' });
  return true;
}

export function resetRateLimitForTests(): void {
  hits.clear();
}
