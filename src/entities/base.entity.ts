import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Exclude, Expose } from "class-transformer";
import { generateUuid } from "../utils/generateUuid";

export abstract class Base extends BaseEntity {
  @Column({ primary: true, type: "uuid" })
  id: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "int", default: 1 })
  sortOrder: number;

  @Exclude()
  @Column({ type: "boolean", default: false, select: false })
  isDeleted: boolean;

  @Expose()
  get deleted(): boolean {
    return false;
  }

  @BeforeInsert()
  setId() {
    this.id = generateUuid();
  }
}
