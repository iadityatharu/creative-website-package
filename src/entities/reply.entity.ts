import { Entity, Column, ManyToOne } from "typeorm";
import { Base } from "./base.entity";
import { Inquiry } from "./inquiry.entity";
import { Application } from "./application.entity";
import { User } from "./user.entity";
import { Contact } from "./contact.entity";

@Entity("replies")
export class Reply extends Base {
  @Column({ type: "jsonb" })
  message: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.replies, {
    nullable: true,
    onDelete: "CASCADE",
  })
  inquiry?: Inquiry;

  @ManyToOne(() => Application, (application) => application.replies, {
    nullable: true,
    onDelete: "CASCADE",
  })
  jobApplication?: Application;

  @ManyToOne(() => Contact, (contact) => contact.replies, {
    nullable: true,
    onDelete: "CASCADE",
  })
  contact?: Contact;

  @ManyToOne(() => User, { nullable: true })
  repliedBy?: User;
}
