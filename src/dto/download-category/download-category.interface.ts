import { DownloadKind } from "../../constant/enum.constant";

export interface IProductDownloadCategory {
  id?: string;
  productId?: string;
  kind?: DownloadKind;
  title?: string;
  subtitle?: string;
  iconKey?: string;
  isActive?: boolean;
  sortOrder?: number;
  extra?: Record<string, unknown>;
}
