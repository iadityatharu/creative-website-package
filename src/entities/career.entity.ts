import { Entity, Column, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { Application } from "./application.entity";
import { JobType } from "../constant/enum.constant";

@Entity("careers")
export class Career extends Base {
  @Column()
  title: string;

  @Column({ unique: true, nullable: true })
  slug: string;

  @Column()
  department: string;

  @Column()
  location: string;

  @Column({
    type: "enum",
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  jobType: JobType;

  @Column({ type: "jsonb", nullable: true })
  description: any;

  @Column({ type: "text", nullable: true })
  requirements: string;

  @Column({ nullable: true })
  salaryRange: string;

  @Column({ default: true })
  isOpen: boolean;

  @OneToMany(() => Application, (application) => application.career)
  applications: Application[];
}
