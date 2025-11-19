import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { MediaAsset } from "./mediaAssets.entity";
import { Product } from "./product.entity";

@Entity("gallery")
export class Gallery extends Base {
  @Column({ nullable: true })
  caption: string;

  @Column({ type: "boolean", nullable: false, default: false })
  isHome: boolean;

  @ManyToOne(() => Product, (product) => product.gallery, {
    onDelete: "CASCADE",
  })
  product: Product;

  @OneToMany(() => MediaAsset, (m) => m.gallery)
  mediaAsset: MediaAsset[];
}
