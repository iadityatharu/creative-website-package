import { Entity, Column, Index } from "typeorm";
import { Base } from "./base.entity";

@Entity("user_metadata")
@Index(["userId", "createdAt"])
@Index(["ip"])
export class UserMetadata extends Base {
  @Column({ type: "uuid", nullable: true })
  userId?: string;

  @Column({ type: "varchar", nullable: true })
  ip?: string;

  @Column({ type: "varchar", nullable: true })
  country?: string;

  @Column({ type: "varchar", nullable: true })
  city?: string;

  @Column({ type: "varchar", nullable: true })
  region?: string;

  @Column({ type: "varchar", nullable: true })
  os?: string;

  @Column({ type: "varchar", nullable: true })
  browser?: string;

  @Column({ type: "varchar", nullable: true })
  device?: string;
}
