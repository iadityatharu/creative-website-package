import { Request, Response, NextFunction } from "express";
import { rateLimiter } from "../configs/rateLimitter.config";
import { Logger } from "../utils/chalk";

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await rateLimiter.consume(req.ip);
    return next();
  } catch (err) {
    Logger.error(`Rate limit exceeded for ${req.ip}`);
    return res.status(429).json({
      status: 429,
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }
};
