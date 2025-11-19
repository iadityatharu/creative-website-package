import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../configs/r2.config";

const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

const extractKeyFromUrl = (url: string): string | null => {
  if (!url) return null;

  const trimmedBase = PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (trimmedBase && url.startsWith(trimmedBase)) {
    const remainder = url.slice(trimmedBase.length).replace(/^\/+/, "");
    return remainder || null;
  }

  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
};

export const deleteFromR2 = async (fileUrl: string) => {
  const key = extractKeyFromUrl(fileUrl);
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  await r2.send(command);
};

export default deleteFromR2;
