import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { r2, R2_BUCKET } from "./r2.config";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";
import pLimit from "p-limit";

const CONCURRENCY_LIMIT = 5;
const limit = pLimit(CONCURRENCY_LIMIT);

export const r2UploadUtil = async (
  files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] },
  folder: string = "uploads"
): Promise<string[]> => {
  try {
    let fileArray: Express.Multer.File[] = [];

    if (Array.isArray(files)) fileArray = files;
    else if (files && typeof files === "object")
      fileArray = Object.values(files).flat();

    const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;
    if (!PUBLIC_BASE_URL) {
      throw new expressError(
        StatusCode.INTERNAL_SERVER_ERROR,
        "R2_PUBLIC_BASE_URL environment variable is not set"
      );
    }

    const uploadPromises = fileArray.map((file) =>
      limit(async () => {
        const originalName = file.originalname.split(".")[0] || "file";
        const fileExtension = file.originalname.split(".").pop() || "";
        const uniqueName = `${folder}/${originalName}-${Date.now()}-${uuidv4().slice(
          0,
          8
        )}.${fileExtension}`;

        const command = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: uniqueName,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await r2.send(command);

        const fileUrl = new URL(uniqueName, PUBLIC_BASE_URL).toString();
        return fileUrl;
      })
    );

    return await Promise.all(uploadPromises);
  } catch (error: any) {
    if (error instanceof expressError) throw error;
    throw new expressError(
      StatusCode.INTERNAL_SERVER_ERROR,
      error.message || "R2 upload failed"
    );
  }
};
