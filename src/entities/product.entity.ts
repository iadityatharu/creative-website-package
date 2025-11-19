import { Entity, Column, ManyToOne, OneToMany, Index } from "typeorm";
import { Base } from "./base.entity";
import { SubCategory } from "./subcategory.entity";
import { Gallery } from "./gallery.entity";
import { Video } from "./video.entity";
import { ProductDownload } from "./product-download";
import { ProductDownloadCategory } from "./download-category";
import { ProductType } from "../constant/enum.constant";

@Entity("products")
@Index(["name", "slug"])
export class Product extends Base {
  @Column()
  name!: string;

  @Column({ nullable: true })
  sku?: string;

  @Column({ nullable: true })
  coverImage?: string | null;

  @Column("text", { array: true, nullable: true })
  detailImage?: string[] | null;

  @Column({ unique: true })
  slug!: string;

  @Column({
    type: "enum",
    enum: ProductType,
    default: ProductType.PHYSICAL,
  })
  productType!: ProductType;

  @Column({ nullable: true })
  model?: string;

  @Column({ nullable: true })
  manualUrl?: string;

  @Column({ nullable: true })
  brochureUrl?: string;

  @Column("decimal", { precision: 12, scale: 2, nullable: true })
  price?: number;

  @Column("decimal", { precision: 12, scale: 2, nullable: true })
  yearlyPrice?: number;

  @Column("decimal", { precision: 12, scale: 2, nullable: true })
  mrp?: number;

  @Column({ type: "text", nullable: true })
  shortDescription?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  technology?: string;

  @Column({ type: "jsonb", nullable: true })
  feature?: any;

  @Column({ type: "text", nullable: true })
  metaTitle?: string;

  @Column({ type: "text", array: true, nullable: true })
  metatag?: string[];

  @Column({ type: "text", nullable: true })
  metadescription?: string;

  @Column({ type: "boolean", default: true })
  isPublished!: boolean;

  @Column({ type: "boolean", default: false })
  isPopular!: boolean;

  @ManyToOne(() => SubCategory, { onDelete: "SET NULL", nullable: true })
  subcategory?: SubCategory;

  @OneToMany(() => Gallery, (g) => g.product, { cascade: true })
  gallery!: Gallery[];

  @OneToMany(() => Video, (video) => video.product, { cascade: true })
  videos!: Video[];

  @OneToMany(() => ProductDownloadCategory, (c) => c.product, { cascade: true })
  downloadCategories!: ProductDownloadCategory[];

  @OneToMany(() => ProductDownload, (d) => d.product, { cascade: true })
  downloads!: ProductDownload[];
}
