import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import { redisConfig } from "./redis.config";

const redisClient = new Redis(redisConfig);

export const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware_rate_limiter",
  points: 20,
  duration: 1,
  blockDuration: 300,
});
