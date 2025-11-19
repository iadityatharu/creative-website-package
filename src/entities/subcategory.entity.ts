import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { Category } from "./category.entity";
import { Product } from "./product.entity";

@Entity("sub_categories")
export class SubCategory extends Base {
  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ type: "jsonb", nullable: true })
  description: any;

  @ManyToOne(() => Category, (category) => category.subCategories, {
    onDelete: "CASCADE",
  })
  category: Category;

  @OneToMany(() => Product, (product) => product.subcategory)
  products: Product[];
}
