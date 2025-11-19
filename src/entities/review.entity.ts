import { Entity, Column } from "typeorm";
import { Base } from "./base.entity";

@Entity("reviews")
export class Review extends Base {
  @Column()
  reviewerName: string;

  @Column()
  reviewerEmail: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: "text" })
  comment: string;

  @Column({ type: "int" })
  rating: number;

  @Column({ default: true })
  isPublished: boolean;
}
