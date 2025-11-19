import { Entity, Column, ManyToOne, OneToMany, Index, Unique } from "typeorm";
import { Base } from "./base.entity";
import { Product } from "./product.entity";
import { DownloadKind } from "../constant/enum.constant"; 
import { ProductDownload } from "./product-download"; 

@Entity("product_download_categories")
@Unique("uq_product_kind", ["product", "kind"]) 
@Index(["product", "sortOrder"])
export class ProductDownloadCategory extends Base {
  @ManyToOne(() => Product, (p) => p.downloadCategories, {
    onDelete: "CASCADE",
  })
  product!: Product;

  @Column({ type: "enum", enum: DownloadKind, enumName: "download_kind_enum" })
  kind!: DownloadKind;

  @Column({ type: "varchar", length: 120 })
  title!: string; 

  @Column({ type: "varchar", length: 240, nullable: true })
  subtitle?: string;

  @Column({ type: "varchar", length: 60, nullable: true })
  iconKey?: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "jsonb", default: () => "'{}'" })
  extra!: Record<string, unknown>;

  @OneToMany(() => ProductDownload, (d) => d.category, {
    cascade: ["insert", "update"],
  })
  items!: ProductDownload[];
}
