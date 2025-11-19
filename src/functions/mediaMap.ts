import { MediaType } from "../constant/enum.constant";
import { MediaAsset } from "../entities/mediaAssets.entity";
import { FileUpload, FileUploadMap } from "../types/fileUploadtypes";
export class MediaMap {
  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("image/")) return MediaType.IMAGE;
    if (mimeType.startsWith("video/")) return MediaType.VIDEO;
    if (mimeType === "application/pdf") return MediaType.DOCUMENT;
    return MediaType.DOCUMENT;
  }

  private mapFiles(files?: FileUpload[]): MediaAsset[] {
    return (files || [])
      .filter((f) => f?.fileUrl)
      .map((f) =>
        Object.assign(new MediaAsset(), {
          fileUrl: f.fileUrl,
          type: this.getMediaType(f.type),
        })
      );
  }

  public mapAll(rawFiles?: FileUploadMap): {
    coverImage: MediaAsset | null;
    logo: MediaAsset | null;
    [key: string]: MediaAsset | MediaAsset[] | null;
  } {
    if (!rawFiles) return { coverImage: null, logo: null };

    const result: any = { coverImage: null, logo: null };
    for (const [field, files] of Object.entries(rawFiles)) {
      const mapped = this.mapFiles(files);
      if (field === "coverImage" || field === "logo") {
        result[field] = mapped[0] || null;
      } else {
        result[field] = mapped;
      }
    }
    return result;
  }
}
