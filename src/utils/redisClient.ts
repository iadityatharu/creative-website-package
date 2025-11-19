import Redis from "ioredis";
import { redisConfig } from "../configs/redis.config";

const redis = new Redis(redisConfig);

export const setCache = async (key: string, value: any, ttlSeconds = 1800) => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const getCache = async (key: string) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteCache = async (keyOrPattern: string) => {
  if (keyOrPattern.includes("*")) {
    let cursor = 0;
    do {
      const [newCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        keyOrPattern,
        "COUNT",
        100
      );
      cursor = Number(newCursor);
      if (keys.length) await redis.del(...keys);
    } while (cursor !== 0);
  } else {
    await redis.del(keyOrPattern);
  }
};

export default redis;
