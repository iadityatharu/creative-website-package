import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import indexRoute from "../routes/index.route";
import { rateLimiterMiddleware } from "../middleware/rateLimitter";
import { globalErrorHandler } from "../middleware/globarErrorHandler";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/message.interface";
import { EmailWorker } from "../email/email.worker";
import { initSocket } from "./socket.config";
import { autoTrackUser } from "../middleware/autoTrackUser";
import { clientHintsOptIn } from "../middleware/clientHints";
import { verifyCaptchaMiddleware } from "../utils/verifyCaptch";
import { UserMetadataWorker } from "../queue/userMetadata.worker";

export const createApp = (): express.Express => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  const server = http.createServer(app);
  initSocket(server);

  const envAllowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const devAllowed = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://localhost:4173",
  ];
  const allowedOrigins = [...new Set([...envAllowed, ...devAllowed])];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-API-Key",
      "X-Recaptcha-Token",
    ],
    credentials: true,
    maxAge: 86400,
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options(
    /.*/,
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(clientHintsOptIn);
  app.use(autoTrackUser);
  const isTestEnv = process.env.NODE_ENV?.toLowerCase() === "test";
  const isBypassEnabled = process.env.RECAPTCHA_BYPASS === "true";

  // if (!isTestEnv && !isBypassEnabled) {
  //   app.use(verifyCaptchaMiddleware);
  // }

  EmailWorker.start();
  UserMetadataWorker.start();

  app.use((req, res, next) =>
    req.method === "OPTIONS" ? next() : rateLimiterMiddleware(req, res, next)
  );

  app.get("/api/v1/creative", (_req, res) => {
    res.status(200).json({
      message: "Backend Working Fine",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  app.use("/api/v1/creative", indexRoute);

  app.all(/.*/, (req, _res, next) => {
    next(
      new expressError(
        StatusCode.NOT_FOUND,
        `${Message.PAGE_NOT_FOUND} - ${req.method} ${req.path}`
      )
    );
  });

  app.use(globalErrorHandler);
  return app;
};
