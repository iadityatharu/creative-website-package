import { parsePhoneNumberFromString } from "libphonenumber-js";

export class PhoneUtil {
  static normalizeToE164(input: string): string {
    if (!input) return "";
    let cleaned = input.trim().replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) {
      cleaned = `+${cleaned.slice(2)}`;
    }
    if (!cleaned.startsWith("+")) {
      cleaned = `+${cleaned}`;
    }
    return cleaned;
  }
  static isValidPhone(input: string): boolean {
    if (!input || typeof input !== "string") return false;

    const normalized = this.normalizeToE164(input);

    try {
      const phoneNumber = parsePhoneNumberFromString(normalized);
      if (!phoneNumber?.isValid()) return false;

      const nationalNumber = phoneNumber.nationalNumber?.toString?.() ?? "";
      if (nationalNumber.length < 9) return false;

      return true;
    } catch {
      return false;
    }
  }
}
