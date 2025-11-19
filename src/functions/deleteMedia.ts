import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../configs/r2.config";
import { AppDataSource } from "../configs/psqlDb.config";
import { MediaAsset } from "../entities/mediaAssets.entity";
import { In } from "typeorm";

interface DeleteMediaOptions {
  mediaIds?: string | string[];
  urls?: string | string[];
}

export async function deleteMedia(options: DeleteMediaOptions) {
  const { mediaIds, urls } = options;
  const keysToDelete: string[] = [];

  const getKeyFromUrl = (url: string) => {
    const parts = url.split(".dev/");
    if (!parts[1]) return null;
    return decodeURIComponent(parts[1]);
  };

  if (urls) {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    urlArray.forEach((url) => {
      const key = getKeyFromUrl(url);
      if (key) keysToDelete.push(key);
    });
  }

  if (mediaIds) {
    const mediaRepo = AppDataSource.getRepository(MediaAsset);
    const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];
    const mediaAssets = await mediaRepo.find({ where: { id: In(ids) } });
    mediaAssets.forEach((media) => {
      if (media.fileUrl) {
        const key = getKeyFromUrl(media.fileUrl);
        if (key) keysToDelete.push(key);
      }
    });
    await mediaRepo.delete({ id: In(ids) });
  }

  const deleted: string[] = [];
  const failed: string[] = [];

  for (const key of keysToDelete) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      deleted.push(key);
    } catch (err) {
      failed.push(key);
    }
  }

  return { deleted, failed };
}
