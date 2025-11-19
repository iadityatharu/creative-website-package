import { Repository, EntityTarget } from "typeorm";
import { AppDataSource } from "../configs/psqlDb.config";

export abstract class BaseService<T> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity);
  }
}
