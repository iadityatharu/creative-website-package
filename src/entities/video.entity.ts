import { Column, Entity, ManyToOne } from "typeorm";
import { Base } from "./base.entity";
import { Product } from "./product.entity";

@Entity("videos")
export class Video extends Base {
  @Column()
  productModelNumber: string;

  @Column()
  youtubeVideoId: string;

  @Column()
  title: string;

  @ManyToOne(() => Product, (product) => product.videos, {
    onDelete: "CASCADE",
  })
  product: Product;
}
