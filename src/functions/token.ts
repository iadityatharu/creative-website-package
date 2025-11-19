import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/interface.constant";

export class Token {
  private secret: Secret;
  private expiry: string;

  constructor(secret: string, expiry: string = "15m") {
    if (!secret) {
      throw new expressError(
        StatusCode.BAD_REQUEST,
        `${Message.BAD_REQUEST} JWT secret required`
      );
    }
    this.secret = secret;
    this.expiry = expiry;
  }

  generateToken(payload: object): string {
    const options: SignOptions = {
      expiresIn: this.expiry as `${number}${"s" | "m" | "h" | "d"}` | number,
    };
    return jwt.sign(payload, this.secret, options);
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, this.secret);
    } catch (err) {
      throw new expressError(
        StatusCode.UNAUTHORIZED,
        "Invalid or expired token"
      );
    }
  }
}
