interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(req: Request): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  // Extract IP from headers or fallback
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || '127.0.0.1';

  const now = Date.now();
  const record = rateLimitStore.get(clientIp) || { timestamps: [] };

  // Filter timestamps within current window
  const validTimestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = validTimestamps[0];
    const resetTime = oldestTimestamp + WINDOW_MS;
    const minutesLeft = Math.ceil((resetTime - now) / 60000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Rate limit reached (max ${MAX_REQUESTS} requests per hour). Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(clientIp, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
    resetTime: now + WINDOW_MS,
  };
}
