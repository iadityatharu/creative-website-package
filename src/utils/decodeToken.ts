import jwt from "jsonwebtoken";
import { expressError } from "./expressError";
import { StatusCode } from "../constant/statusCode.interface";

export function decodeToken(token: string): { id: string } {
  try {
    if (!token) {
      throw new expressError(StatusCode.NOT_FOUND, "Token not found");
    }
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new expressError(
        StatusCode.INTERNAL_SERVER_ERROR,
        "JWT secret not configured"
      );
    }
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded === "string") {
      throw new expressError(StatusCode.UNAUTHORIZED, "Invalid token payload");
    }

    return decoded as { id: string };
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new expressError(StatusCode.UNAUTHORIZED, "Token expired");
    } else if (err.name === "JsonWebTokenError") {
      throw new expressError(StatusCode.UNAUTHORIZED, "Malformed token");
    } else {
      throw new expressError(
        StatusCode.UNAUTHORIZED,
        err.message || "Token verification failed"
      );
    }
  }
}
