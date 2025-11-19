import { Entity, Column, OneToMany, ManyToOne, Index } from "typeorm";
import { MediaAsset } from "./mediaAssets.entity";
import { User } from "./user.entity";
import { Base } from "./base.entity";

@Entity({ name: "blogPosts" })
@Index(["id", "slug"])
export class BlogPost extends Base {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  excerpt?: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: "jsonb", nullable: false })
  description:any
  
  @Column({ type: "varchar", nullable: false })
  coverImage: string;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  author: User;

  @Column({ type: "int", nullable: false })
  estimatedReadTime: number;

  @OneToMany(() => MediaAsset, (media) => media.blogPost)
  mediaAssets: MediaAsset[];
}
