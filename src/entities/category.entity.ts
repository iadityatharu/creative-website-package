import { Entity, Column, OneToMany, Index } from "typeorm";
import { Base } from "./base.entity";
import { SubCategory } from "./subcategory.entity";

@Entity("categories")
@Index("idx_active", ["slug"], { where: '"isDeleted" = false' })
export class Category extends Base {
  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ type: "jsonb", nullable: true })
  description: any;

  @OneToMany(() => SubCategory, (subCategory) => subCategory.category)
  subCategories: SubCategory[];
}
