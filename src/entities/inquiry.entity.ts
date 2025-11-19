import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { Base } from "./base.entity";
import { Product } from "./product.entity";
import { Reply } from "./reply.entity";

@Entity("inquiries")
export class Inquiry extends Base {
  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: "text", nullable: true })
  message?: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  product: Product;

  @OneToMany(() => Reply, (reply) => reply.inquiry, { cascade: true })
  replies: Reply[];

  @Column({ default: false })
  isHandled: boolean;
}
