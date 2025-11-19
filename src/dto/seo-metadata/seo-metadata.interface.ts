import {
  AlternatesBlock,
  OpenGraphBlock,
  RobotsBlock,
  SeoEntityType,
  TwitterBlock,
} from "../../constant/enum.constant";

export interface ISeoMetadata {
  id?: string;
  entityType?: SeoEntityType;
  entityId?: string;
  slug?: string;
  title?: string;
  description?: string;
  keywords?: string[] | null;
  canonicalUrl?: string;
  openGraph?: OpenGraphBlock | null;
  twitter?: TwitterBlock | null;
  robots?: RobotsBlock | null;
  alternates?: AlternatesBlock | null;
  jsonLd?: Record<string, any> | null;
  extraMeta?: Record<string, any> | null;
  isIndexable?: boolean;
  isOptimized?: boolean;
  sitemapUrl?: string;
  manifestUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
