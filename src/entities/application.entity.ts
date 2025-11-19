import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { Career } from "./career.entity";
import { ApplicationStatus } from "../constant/enum.constant";
import { Reply } from "./reply.entity";

@Entity("applications")
export class Application extends Base {
  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  position: string;

  @Column({ type: "boolean", default: false })
  isView: boolean;
  
  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  resumeUrl: string;

  @Column({ nullable: true })
  coverLetterUrl: string;

  @Column({
    type: "enum",
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @ManyToOne(() => Career, (career) => career.applications, {
    onDelete: "CASCADE",
  })
  career: Career;

  @OneToMany(() => Reply, (reply) => reply.jobApplication, { cascade: true })
  replies: Reply[];
}
