import { Column, Entity, Index } from "typeorm";
import { Base } from "./base.entity";

@Entity("teammember")
@Index(["id"])
export class TeamMember extends Base {
  @Column({ nullable: false, type: "boolean", default: false })
  addToHome: boolean;

  @Column({ nullable: false, type: "varchar" })
  fullname: string;

  @Column({ nullable: false, type: "varchar" })
  designation: string;

  @Column({ nullable: true, type: "varchar" })
  image?: string;

  @Column({ nullable: false, type: "varchar" })
  countryCode: string;

  @Column({ nullable: false, type: "varchar" })
  phoneNumber: string;

  @Column({ nullable: true, type: "varchar" })
  facebook?: string;

  @Column({ nullable: true, type: "varchar" })
  twitter?: string;

  @Column({ nullable: true, type: "varchar" })
  linkedin?: string;

  @Column({ nullable: true, type: "varchar" })
  instagram?: string;
}
