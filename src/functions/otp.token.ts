import bcrypt from "bcryptjs";
import { Auth } from "../entities/auth.entity";
function generateAlphanumericOtp(length = 6): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}
export async function generateOtp(auth: Auth, length = 6) {
  const otp = generateAlphanumericOtp(length);

  const otpHash = await bcrypt.hash(otp, 10);

  const otpExpiry = new Date(Date.now() + 3 * 60 * 1000); 

  auth.otpHash = otpHash;
  auth.otpExpiry = otpExpiry;

  await auth.save();

  return otp; 
}
