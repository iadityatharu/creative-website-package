import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { expressError } from "./expressError";
import { StatusCode } from "../constant/statusCode.interface";

export async function generateResetToken(id: string) {
  try {
    const jwtToken = jwt.sign(
      { id },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" }
    );
    const hashedToken = await bcrypt.hash(jwtToken, 12);
    return { hashedToken, jwtToken };
  } catch (error) {
    throw new expressError(StatusCode.BAD_REQUEST, error.message);
  }
}
