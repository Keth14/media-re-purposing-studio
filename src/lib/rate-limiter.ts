interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function getRateLimitPerHour(): number {
  const envVal = process.env.RATE_LIMIT_PER_HOUR;
  if (!envVal) return 30;
  const parsed = parseInt(envVal, 10);
  return isNaN(parsed) || parsed <= 0 ? 30 : parsed;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || '127.0.0.1';
}

/**
 * Checks if client is within rate limits.
 * Does NOT increment request count — request is only counted after success.
 */
export function checkRateLimit(req: Request): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  const limit = getRateLimitPerHour();

  // Disable completely in development
  if (process.env.NODE_ENV === 'development') {
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + WINDOW_MS,
    };
  }

  const clientIp = getClientIp(req);
  const now = Date.now();
  const record = rateLimitStore.get(clientIp) || { timestamps: [] };

  // Filter timestamps within current 1-hour window
  const validTimestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetTime = oldestTimestamp + WINDOW_MS;
    const minutesLeft = Math.ceil((resetTime - now) / 60000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Rate limit reached (max ${limit} requests per hour). Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
    };
  }

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetTime: now + WINDOW_MS,
  };
}

/**
 * Records a successful request against the client IP rate limit.
 * Must only be called after the request completes successfully.
 */
export function recordRateLimitSuccess(req: Request): void {
  // In development, skip tracking
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const clientIp = getClientIp(req);
  const now = Date.now();
  const record = rateLimitStore.get(clientIp) || { timestamps: [] };

  const validTimestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  validTimestamps.push(now);

  rateLimitStore.set(clientIp, { timestamps: validTimestamps });
}

export function resetRateLimitForIp(ip: string): void {
  rateLimitStore.delete(ip);
}
