import { Entity, Column, ManyToOne } from "typeorm";
import { MediaType } from "../constant/enum.constant";
import { Gallery } from "./gallery.entity";
import { Base } from "./base.entity";
import { BlogPost } from "./blog.entity";

@Entity({ name: "mediaAssets" })
export class MediaAsset extends Base {
  @Column()
  fileUrl!: string;

  @Column({ type: "enum", enum: MediaType })
  type!: MediaType;

  @ManyToOne(() => Gallery, (g) => g.mediaAsset, {
    nullable: true,
    onDelete: "CASCADE",
  })
  gallery?: Gallery;

  @ManyToOne(() => BlogPost, (blog) => blog.mediaAssets, {
    nullable: true,
    onDelete: "CASCADE",
  })
  blogPost?: BlogPost;
}
