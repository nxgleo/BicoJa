import { redis } from "./redis";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

export async function checkRateLimit(
  identifier: string,
  limit = 100,
  windowInSeconds = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const currentRequests = await redis.incr(key);

  if (currentRequests === 1) {
    await redis.expire(key, windowInSeconds);
  }

  const remaining = Math.max(0, limit - currentRequests);
  const success = currentRequests <= limit;

  return { success, limit, remaining };
}