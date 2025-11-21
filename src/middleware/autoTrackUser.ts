import { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Logger } from "../utils/chalk";
import { UserMetadataQueue } from "../queue/userMetadata.queue";
const botUserAgents = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /wget/i,
  /curl/i,
  /uptimerobot/i,
];

const isBot = (ua = "") => botUserAgents.some((re) => re.test(ua));

function getClientIp(req: Request): string | undefined {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp) return cfIp;

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0].trim();

  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string" && xri) return xri;

  return (req.ip as string) || req.socket.remoteAddress || undefined;
}

function safeJoin(a?: string | null, b?: string | null) {
  const x = (a || "").trim();
  const y = (b || "").trim();
  if (x && y) return `${x} ${y}`;
  if (x) return x;
  if (y) return y;
  return "";
}

function friendlyWindows(platformVersion?: string | null) {
  if (!platformVersion) return null;
  const major = parseInt(platformVersion.split(".")[0] || "0", 10);
  if (Number.isFinite(major) && major >= 13) return "Windows 11";
  if (Number.isFinite(major) && major >= 10) return "Windows 10";
  return null;
}

function getUserIdFromToken(req: Request): string | undefined {
  const token = req.cookies?.accessToken;
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!token || !secret) return undefined;

  try {
    const payload = jwt.verify(token, secret) as JwtPayload & { id?: string };
    const id =
      typeof payload === "object" && payload && "id" in payload
        ? (payload as any).id
        : undefined;
    return typeof id === "string" ? id : undefined;
  } catch (error) {
    Logger.warning(`Failed to decode access token for autoTrackUser: ${error}`);
    return undefined;
  }
}

export const autoTrackUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.method === "OPTIONS" || req.path === "/healthz") return next();

    const ua = (req.headers["user-agent"] as string) || "";
    req.isBot = isBot(ua);
    if (req.isBot) return next();

    const ch = {
      brands: (req.headers["sec-ch-ua"] as string) || "",
      fullBrands: (req.headers["sec-ch-ua-full-version-list"] as string) || "",
      platform:
        (req.headers["sec-ch-ua-platform"] as string)?.replace(/"/g, "") || "",
      platformVersion:
        (req.headers["sec-ch-ua-platform-version"] as string)?.replace(
          /"/g,
          ""
        ) || "",
      model:
        (req.headers["sec-ch-ua-model"] as string)?.replace(/"/g, "") || "",
      formFactor:
        (req.headers["sec-ch-ua-form-factor"] as string)?.replace(/"/g, "") ||
        "",
    };

    const osFromCH = ch.platform
      ? ch.platformVersion
        ? `${ch.platform} ${ch.platformVersion}`
        : ch.platform
      : null;

    const brandSource = ch.fullBrands || ch.brands;
    let browserFromCH: string | null = null;
    if (brandSource) {
      const pairs = brandSource
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
      const parsed = pairs
        .map((p) => {
          const m = p.match(/([^;]+);v="?([^"]+)"?/);
          return m ? { name: m[1], version: m[2] } : null;
        })
        .filter(Boolean) as { name: string; version: string }[];

      const brave = parsed.find((b) => /brave/i.test(b.name));
      const chromium = parsed.find((b) => /chrome|chromium/i.test(b.name));
      const nonNot = parsed.find((b) => !/^not/i.test(b.name));
      const primary = brave || chromium || nonNot || parsed[0];
      if (primary) browserFromCH = `${primary.name} ${primary.version}`;
    }

    const deviceFromCH = ch.model || ch.formFactor || null;

    const parser = new UAParser(ua);
    const agent = parser.getResult();

    const osViaUA = safeJoin(agent.os?.name || null, agent.os?.version || null);
    let os = osFromCH || osViaUA || "Unknown";

    if (/^Windows$/i.test(ch.platform)) {
      const mapped = friendlyWindows(ch.platformVersion);
      if (mapped) os = mapped;
    }

    const browserViaUA = safeJoin(
      agent.browser?.name || null,
      agent.browser?.version || null
    );
    const browser = browserFromCH || browserViaUA || "Unknown";

    const device =
      deviceFromCH ||
      agent.device?.model ||
      agent.device?.type ||
      agent.device?.vendor ||
      "Unknown";

    const ip = getClientIp(req) || "0.0.0.0";
    const geo = ip ? geoip.lookup(ip) : null;

    req.userMetadata = {
      ip,
      country: geo?.country || null,
      city: geo?.city || null,
      region: geo?.region || null,
      os,
      browser,
      device,
    };

    const userId = getUserIdFromToken(req);

    await UserMetadataQueue.enqueue({
      userId: userId ?? null,
      ip: req.userMetadata.ip ?? null,
      country: req.userMetadata.country ?? null,
      city: req.userMetadata.city ?? null,
      region: req.userMetadata.region ?? null,
      os: req.userMetadata.os ?? null,
      browser: req.userMetadata.browser ?? null,
      device: req.userMetadata.device ?? null,
    });

    next();
  } catch (error) {
    Logger.error(`Exception from autoTrackUser middleware: ${error}`);
    next();
  }
};
