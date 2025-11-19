import { Column, Entity, Index, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { ContactPurpose } from "../constant/enum.constant";
import { Reply } from "./reply.entity";

@Entity("inquiry")
@Index(["id"])
export class Contact extends Base {
  @Column({ type: "varchar", nullable: false })
  fullname: string;

  @Column({ type: "varchar", nullable: false })
  email: string;

  @Column({ type: "varchar", nullable: true })
  organization?: string;

  @Column({ type: "varchar", nullable: false })
  phoneNo: string;

  @Column({ type: "varchar", nullable: false })
  address: string;

  @Column({ type: "varchar", nullable: false })
  message: string;

  @Column({ type: "boolean", default: false })
  isView: boolean;

  @Column({ type: "enum", enum: ContactPurpose })
  purpose: ContactPurpose;

  @OneToMany(() => Reply, (reply) => reply.contact, { cascade: true })
  replies: Reply[];
}
