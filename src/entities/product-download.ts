import { Entity, Column, ManyToOne, Index } from "typeorm";
import { Base } from "./base.entity";
import { Product } from "./product.entity";
import { ProductDownloadCategory } from "./download-category";
import { Platform } from "../constant/enum.constant";

@Entity("product_downloads")
@Index(["product", "category", "sortOrder"])
export class ProductDownload extends Base {
  @ManyToOne(() => Product, (p) => p.downloads, { onDelete: "CASCADE" })
  product!: Product;

  @ManyToOne(() => ProductDownloadCategory, (c) => c.items, {
    onDelete: "CASCADE",
  })
  category!: ProductDownloadCategory;

  @Column({ type: "varchar", length: 180 })
  title!: string;

  @Column({ type: "varchar", length: 240, nullable: true })
  summary?: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  version?: string;

  @Column({ type: "date", nullable: true })
  releasedOn?: string;

  @Column({ type: "bigint", nullable: true })
  sizeBytes?: string;

  @Column({ type: "varchar", length: 1000 })
  downloadUrl!: string;

  @Column({ type: "jsonb", nullable: true })
  mirrors?: Array<{ label: string; url: string }>;

  @Column({
    type: "enum",
    enum: Platform,
    enumName: "download_platform_enum",
    array: true,
  })
  platforms!: Platform[];

  @Column({ type: "varchar", length: 120, nullable: true })
  minOsVersion?: string;

  @Column({ type: "varchar", length: 60, nullable: true })
  fileType?: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  sha256?: string;

  @Column({ type: "boolean", default: false })
  deprecated!: boolean;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "jsonb", default: () => "'{}'" })
  extra!: Record<string, unknown>;
}
