import { ProductType } from "../../constant/enum.constant";

export interface IProduct {
  id?: string;
  name?: string;
  slug?: string;
  sku?: string;
  coverImage?: string | null;
  detailImage?: string[] | null;
  yearlyPrice?: number;
  model?: string;
  manualUrl?: string | null;
  brochureUrl?: string | null;
  price?: number;
  mrp?: number;
  shortDescription?: string;
  description?: string;
  technology?: string;
  feature?: any;
  metaTitle?: string;
  metatag?: string[];
  metadescription?: string;
  isPublished?: boolean;
  isPopular?: boolean;
  productType?: ProductType;
  subcategoryId?: string;
  gallery?: any[];
  imageUrl?: string;
  removeUrls?: string[];
}

export interface IProductRecover {
  ids: string[];
}
