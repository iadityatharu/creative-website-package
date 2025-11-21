import {
  Repository,
  EntityTarget,
  SelectQueryBuilder,
  UpdateQueryBuilder,
} from "typeorm";

import { AppDataSource } from "../configs/psqlDb.config";

type Scope = Record<string, string | number>;

export abstract class BaseService<
  T extends { id: string; sortOrder: number; isDeleted: boolean }
> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity);
  }

  protected async resolveSortOrder(
    incomingSortOrder: number | undefined | null,
    options?: { excludeId?: string; scope?: Scope }
  ): Promise<number> {
    const targetSortOrder =
      typeof incomingSortOrder === "number" && !Number.isNaN(incomingSortOrder)
        ? incomingSortOrder
        : await this.getNextSortOrder(options);

    await this.shiftSortOrders(targetSortOrder, options);

    return targetSortOrder;
  }

  private async getNextSortOrder(options?: { scope?: Scope }): Promise<number> {
    const alias = this.repository.metadata.tableName || "entity";

    const qb = this.repository
      .createQueryBuilder(alias)
      .select(`COALESCE(MAX(${alias}."sortOrder"), 0)`, "max")
      .where(`${alias}."isDeleted" = false`);

    this.applyScope(qb, options?.scope, alias);

    const result = await qb.getRawOne<{ max?: string | number }>();
    const max = Number(result?.max ?? 0);
    return Number.isNaN(max) ? 1 : max + 1;
  }

  private async shiftSortOrders(
    targetSortOrder: number,
    options?: { excludeId?: string; scope?: Record<string, string | number> }
  ) {
    const qb = this.repository
      .createQueryBuilder()
      .update(this.repository.target)
      .set({
        sortOrder: () => `"sortOrder" + 1`,
      } as any)
      .where(`"sortOrder" >= :targetSortOrder`, { targetSortOrder })
      .andWhere(`"isDeleted" = false`);

    if (options?.excludeId) {
      qb.andWhere(`"id" != :excludeId`, { excludeId: options.excludeId });
    }

    this.applyScope(qb, options?.scope);

    await qb.execute();
  }

  private applyScope(
    qb: SelectQueryBuilder<T> | UpdateQueryBuilder<T>,
    scope?: Scope,
    alias?: string
  ) {
    if (!scope) return;

    Object.entries(scope).forEach(([field, value]) => {
      const paramKey = `scope_${field}`;
      const qualifiedField = alias ? `${alias}."${field}"` : `"${field}"`;
      qb.andWhere(`${qualifiedField} = :${paramKey}`, {
        [paramKey]: value,
      });
    });
  }
}
