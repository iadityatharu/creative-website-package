import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { expressError } from "./expressError";
import { StatusCode } from "../constant/statusCode.interface";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const DEFAULT_SCORE_THRESHOLD = 0.4;

const BEARER_PREFIX = /^Bearer\s+/i;

const normalizeToken = (
  value: string | string[] | undefined | null
): string | undefined => {
  if (!value) return undefined;

  const raw =
    typeof value === "string"
      ? value
      : value.find((val) => typeof val === "string" && val.trim()) ?? "";

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  return trimmed.replace(BEARER_PREFIX, "").trim() || undefined;
};

const extractRecaptchaToken = (req: Request): string | undefined => {
  const headerCandidates = [
    req.headers["x-recaptcha-token"],
    req.headers["recaptcha-token"],
  ];

  for (const candidate of headerCandidates) {
    const token = normalizeToken(candidate as string | string[] | undefined);
    if (token) return token;
  }

  const bodyCandidates = [
    req.body?.recaptchaToken,
    req.body?.captchaToken,
    req.body?.gRecaptchaToken,
    req.body?.["g-recaptcha-response"],
  ];

  for (const candidate of bodyCandidates) {
    const token = normalizeToken(candidate as string | string[] | undefined);
    if (token) return token;
  }

  const queryCandidates = [
    req.query?.recaptchaToken,
    req.query?.captchaToken,
    req.query?.gRecaptchaToken,
  ];

  for (const candidate of queryCandidates) {
    const token = normalizeToken(candidate as string | string[] | undefined);
    if (token) return token;
  }

  return undefined;
};

export const verifyCaptchaMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }

    if (req.method === "GET") {
      return next();
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      throw new expressError(
        StatusCode.INTERNAL_SERVER_ERROR,
        "reCAPTCHA secret key is not configured"
      );
    }

    const recaptchaToken = extractRecaptchaToken(req);
    if (!recaptchaToken) {
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "reCAPTCHA token is required"
      );
    }

    const payload = new URLSearchParams({
      secret: secretKey,
      response: recaptchaToken,
    });

    const remoteIpRaw =
      req.ip || req.socket?.remoteAddress || req.headers["x-forwarded-for"];
    if (remoteIpRaw) {
      const remoteIp = Array.isArray(remoteIpRaw)
        ? remoteIpRaw[0]
        : remoteIpRaw;
      if (typeof remoteIp === "string" && remoteIp.trim()) {
        payload.append("remoteip", remoteIp.split(",")[0].trim());
      }
    }

    const { data } = await axios.post(
      RECAPTCHA_VERIFY_URL,
      payload.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: Number(process.env.RECAPTCHA_REQUEST_TIMEOUT_MS ?? 5000),
      }
    );

    const scoreThreshold = Number(
      process.env.RECAPTCHA_SCORE_THRESHOLD ?? DEFAULT_SCORE_THRESHOLD
    );

    const hasValidScore =
      typeof data.score !== "number" || data.score >= scoreThreshold;

    if (!data.success || !hasValidScore) {
      const errorCodes = Array.isArray(data["error-codes"])
        ? data["error-codes"]
        : [];
      console.warn("reCAPTCHA verification failed", {
        score: data.score ?? null,
        errorCodes,
      });
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Invalid reCAPTCHA verification"
      );
    }

    return next();
  } catch (error) {
    if (error instanceof expressError) {
      return next(error);
    }

    return next(
      new expressError(
        StatusCode.INTERNAL_SERVER_ERROR,
        "reCAPTCHA validation failed"
      )
    );
  }
};
