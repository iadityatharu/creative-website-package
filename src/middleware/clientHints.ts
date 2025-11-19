import { Request, Response, NextFunction } from "express";
export function clientHintsOptIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader(
    "Accept-CH",
    [
      "Sec-CH-UA",
      "Sec-CH-UA-Full-Version",
      "Sec-CH-UA-Full-Version-List",
      "Sec-CH-UA-Mobile",
      "Sec-CH-UA-Platform",
      "Sec-CH-UA-Platform-Version",
      "Sec-CH-UA-Model",
      "Sec-CH-UA-Arch",
      "Sec-CH-UA-Bitness",
      "Sec-CH-UA-Form-Factor",
    ].join(", ")
  );

  res.setHeader(
    "Permissions-Policy",
    [
      'ch-ua="self"',
      'ch-ua-full-version="self"',
      'ch-ua-full-version-list="self"',
      'ch-ua-mobile="self"',
      'ch-ua-platform="self"',
      'ch-ua-platform-version="self"',
      'ch-ua-model="self"',
      'ch-ua-arch="self"',
      'ch-ua-bitness="self"',
      'ch-ua-form-factor="self"',
    ].join(", ")
  );

  const varyExisting = (res.getHeader("Vary") || "") as string;
  const varySet = new Set(
    (varyExisting ? varyExisting.split(",") : [])
      .map((s) => s.trim())
      .filter(Boolean)
  );
  [
    "Sec-CH-UA",
    "Sec-CH-UA-Full-Version",
    "Sec-CH-UA-Full-Version-List",
    "Sec-CH-UA-Mobile",
    "Sec-CH-UA-Platform",
    "Sec-CH-UA-Platform-Version",
    "Sec-CH-UA-Model",
    "Sec-CH-UA-Arch",
    "Sec-CH-UA-Bitness",
    "Sec-CH-UA-Form-Factor",
    "User-Agent",
  ].forEach((h) => varySet.add(h));
  res.setHeader("Vary", Array.from(varySet).join(", "));

  next();
}
