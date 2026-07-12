import redisClient from "../config/redis";

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = await redisClient.get(key);

  if (cached) {
    return JSON.parse(cached) as T;
  }

  const fresh = await fetchFn();
  await redisClient.set(key, JSON.stringify(fresh), {
    EX: ttlSeconds,
  });
  return fresh;
}
