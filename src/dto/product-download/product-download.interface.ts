import { Platform } from "../../constant/enum.constant";

export interface IProductDownload {
  id?: string;
  productId?: string;
  categoryId?: string;
  title?: string;
  summary?: string;
  version?: string;
  releasedOn?: string;
  sizeBytes?: number | string;
  downloadUrl?: string;
  mirrors?: Array<{ label: string; url: string }>;
  platforms?: Platform[];
  minOsVersion?: string;
  fileType?: string;
  sha256?: string;
  deprecated?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  extra?: Record<string, unknown>;
}
