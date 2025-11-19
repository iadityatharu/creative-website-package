import { BaseService } from "../base.service";
import { Product as ProductEntity } from "../../entities/product.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import { ProductType } from "../../constant/enum.constant";
import { Brackets } from "typeorm";
import { AppDataSource } from "../../configs/psqlDb.config";
import { SubCategory } from "../../entities/subcategory.entity";
import { Category } from "../../entities/category.entity";

export interface IProductListItem {
  id: string;
  slug: string;
  coverImage: string | null;
  title: string;
  sortOrder: number;
  isPopular: boolean;
}

export interface IPaginatedProducts {
  products: IProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductPublicService extends BaseService<ProductEntity> {
  constructor() {
    super(ProductEntity);
  }

  private readonly subcategoryRepo = AppDataSource.getRepository(SubCategory);
  private readonly categoryRepo = AppDataSource.getRepository(Category);

  private buildSearchConditions() {
    const productColumns = this.repository.metadata.columns.map(
      (column) => column.databaseName
    );

    const subcategoryColumns = this.subcategoryRepo.metadata.columns.map(
      (column) => column.databaseName
    );

    const categoryColumns = this.categoryRepo.metadata.columns.map(
      (column) => column.databaseName
    );

    const quoteIdentifier = (identifier: string) =>
      `"${identifier.replace(/"/g, '""')}"`;

    const formatCondition = (alias: string, columnName: string) =>
      `COALESCE(${quoteIdentifier(alias)}.${quoteIdentifier(
        columnName
      )}::text, '') ILIKE :search`;

    return [
      ...productColumns.map((column) => formatCondition("product", column)),
      ...subcategoryColumns.map((column) =>
        formatCondition("subcategory", column)
      ),
      ...categoryColumns.map((column) => formatCondition("category", column)),
    ];
  }

  async getAllProducts(
    page = 1,
    limit = 10
  ): Promise<{ status: number; data: IPaginatedProducts }> {
    const skip = (page - 1) * limit;
    const baseQuery = this.repository
      .createQueryBuilder("product")
      .select([
        "product.id AS id",
        "product.slug AS slug",
        "product.coverImage AS coverImage",
        "product.name AS title",
        "product.sortOrder AS sortOrder",
        "product.isPopular AS isPopular",
      ])
      .where("product.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("product.productType != :productType", {
        productType: ProductType.SAAS,
      });
    const total = await baseQuery.getCount();

    const products = await baseQuery
      .clone()
      .orderBy("product.sortOrder", "ASC")
      .addOrderBy("product.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getRawMany<IProductListItem>();

    return {
      status: StatusCode.OK,
      data: {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchProducts(
    query = "",
    page = 1,
    limit = 10
  ): Promise<{ status: number; data: IPaginatedProducts }> {
    const skip = (page - 1) * limit;
    const searchParam = `%${query}%`;
    const searchConditions = this.buildSearchConditions();

    const baseQuery = this.repository
      .createQueryBuilder("product")
      .select([
        "product.id AS id",
        "product.slug AS slug",
        "product.coverImage AS coverImage",
        "product.name AS title",
        "product.sortOrder AS sortOrder",
        "product.isPopular AS isPopular",
      ])
      .leftJoin(
        "product.subcategory",
        "subcategory",
        "subcategory.isDeleted = false"
      )
      .leftJoin(
        "subcategory.category",
        "category",
        "category.isDeleted = false"
      )
      .where("product.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("product.productType != :productType", {
        productType: ProductType.SAAS,
      })
      .andWhere(
        new Brackets((qb) => {
          for (const condition of searchConditions) {
            qb.orWhere(condition, { search: searchParam });
          }
        })
      );
    const total = await baseQuery.getCount();

    const products = await baseQuery
      .clone()
      .orderBy("product.sortOrder", "ASC")
      .addOrderBy("product.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getRawMany<IProductListItem>();

    return {
      status: StatusCode.OK,
      data: {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
