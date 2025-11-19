import { Entity, Column, OneToOne, Index, OneToMany } from "typeorm";
import { Auth } from "./auth.entity";
import { Gender, UserRole } from "../constant/enum.constant";
import { Base } from "./base.entity";
import { BlogPost } from "./blog.entity";

@Entity("users")
@Index(["email"])
@Index(["phone"])
export class User extends Base {
  @Column({ type: "varchar" })
  firstname: string;

  @Column({ type: "varchar", nullable: true })
  middlename?: string;

  @Column({ type: "varchar" })
  lastname: string;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", unique: true })
  phone: string;

  @Column({ type: "enum", enum: Gender })
  gender: Gender;

  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @Column({ type: "varchar" })
  address: string;

  @Column({ type: "varchar", nullable: true })
  createdBy?: string;

  @Column({ type: "varchar", nullable: true })
  profilePicture?: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToOne(() => Auth, (auth) => auth.user, {
    cascade: true,
    onDelete: "CASCADE",
  })
  auth: Auth;

  @OneToMany(() => BlogPost, (blog) => blog.author, {
    cascade: false,
    onDelete: "SET NULL",
  })
  blogPosts: BlogPost[];
}
