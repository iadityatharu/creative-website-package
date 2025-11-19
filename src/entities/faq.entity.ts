import { Entity, Column, Index } from "typeorm";
import { Base } from "./base.entity";

@Entity("faq")
@Index(["title"])
export class Faq extends Base {
  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "jsonb", nullable: true })
  description: any;

  @Column({ type: "boolean", nullable: false, default: true })
  isActive: boolean;
}
