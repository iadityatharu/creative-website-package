import { Entity, Column, Index, Unique } from "typeorm";
import { AlternatesBlock, OpenGraphBlock, RobotsBlock, SeoEntityType, TwitterBlock } from "../constant/enum.constant";
import { Base } from "./base.entity";

@Entity("seo_metadata")
@Index(["entityId", "slug"])
@Unique("uq_seo_target", ["entityType", "entityId"])
export class SeoMetadata extends Base {
  @Column({ type: "enum", enum: SeoEntityType, nullable: true })
  entityType!: SeoEntityType | null;

  @Column({ type: "uuid", nullable: true })
  entityId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  slug?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  title?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "text", array: true, nullable: true })
  keywords?: string[] | null;

  @Column({ type: "varchar", length: 2048, nullable: true })
  canonicalUrl?: string | null;

  @Column({ type: "jsonb", nullable: true })
  openGraph?: OpenGraphBlock | null;

  @Column({ type: "jsonb", nullable: true })
  twitter?: TwitterBlock | null;

  @Column({ type: "jsonb", nullable: true })
  robots?: RobotsBlock | null;

  @Column({ type: "jsonb", nullable: true })
  alternates?: AlternatesBlock | null;

  @Column({ type: "jsonb", nullable: true })
  jsonLd?: Record<string, any> | null;

  @Column({ type: "jsonb", nullable: true })
  extraMeta?: Record<string, any> | null;

  @Column({ type: "boolean", default: true })
  isIndexable!: boolean;

  @Column({ type: "boolean", default: false })
  isOptimized!: boolean;

  @Column({ type: "varchar", length: 2048, nullable: true })
  sitemapUrl?: string | null;

  @Column({ type: "varchar", length: 2048, nullable: true })
  manifestUrl?: string | null;
}
