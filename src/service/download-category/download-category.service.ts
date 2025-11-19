import { In } from "typeorm";
import { BaseService } from "../base.service";
import { ProductDownloadCategory } from "../../entities/download-category";
import { IProductDownloadCategory } from "../../dto/download-category/download-category.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Product } from "../../entities/product.entity";
import { DownloadKind } from "../../constant/enum.constant";
import { deleteMedia } from "../../functions/deleteMedia";

export class ProductDownloadCategoryService extends BaseService<ProductDownloadCategory> {
  private productRepo = AppDataSource.getRepository(Product);

  constructor() {
    super(ProductDownloadCategory);
  }

  async hardDeleteCategories(
    ids: string[] | string
  ): Promise<{
    status: number;
    deletedCategoryIds: string[];
    deletedAssets: number;
  }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length)
      return {
        status: StatusCode.BAD_REQUEST,
        deletedCategoryIds: [],
        deletedAssets: 0,
      };

    const categories = await this.repository.find({
      where: { id: In(idList) },
      select: ["id", "iconKey"],
    });

    if (!categories.length)
      return {
        status: StatusCode.NOT_FOUND,
        deletedCategoryIds: [],
        deletedAssets: 0,
      };

    const categoryIds = categories.map((category) => category.id);
    const iconUrls = categories
      .map((category) => category.iconKey)
      .filter((url): url is string => Boolean(url));

    await this.repository.delete({ id: In(categoryIds) });

    if (iconUrls.length) {
      deleteMedia({ urls: iconUrls }).catch(console.error);
    }

    return {
      status: StatusCode.OK,
      deletedCategoryIds: categoryIds,
      deletedAssets: iconUrls.length,
    };
  }

  async createCategory(
    data: IProductDownloadCategory
  ): Promise<{ status: number }> {
    if (!data.productId || !data.kind || !data.title) {
      return { status: StatusCode.BAD_REQUEST };
    }

    const product = await this.productRepo.findOne({
      where: { id: data.productId, isDeleted: false },
      select: ["id"],
    });

    if (!product) return { status: StatusCode.NOT_FOUND };

    const { productId, ...rest } = data;
    const category = this.repository.create({
      ...rest,
      product,
    });

    await this.repository.save(category);
    return { status: StatusCode.CREATED };
  }

  async getAllCategories(
    page = 1,
    limit = 10,
    productId?: string,
    kind?: DownloadKind,
    search = "",
    isActive?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("category")
      .leftJoinAndSelect(
        "category.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "category.items",
        "item",
        "item.isDeleted = false AND item.isActive = true"
      )
      .where("category.isDeleted = false");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (kind) {
      query.andWhere("category.kind = :kind", { kind });
    }

    if (search) {
      query.andWhere("category.title ILIKE :search", { search: `%${search}%` });
    }

    if (isActive !== undefined) {
      query.andWhere("category.isActive = :isActive", { isActive });
    }

    query
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [categories, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        categories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryById(
    id: string
  ): Promise<{ status: number; category?: ProductDownloadCategory }> {
    const category = await this.repository
      .createQueryBuilder("category")
      .leftJoinAndSelect(
        "category.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "category.items",
        "item",
        "item.isDeleted = false AND item.isActive = true"
      )
      .where("category.id = :id", { id })
      .andWhere("category.isDeleted = false")
      .getOne();

    if (!category) return { status: StatusCode.NOT_FOUND };

    return { status: StatusCode.OK, category };
  }

  async updateCategory(
    id: string,
    data: IProductDownloadCategory
  ): Promise<{ status: number }> {
    const category = await this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ["product"],
    });

    if (!category) return { status: StatusCode.NOT_FOUND };

    let product = category.product;
    if (data.productId) {
      product = await this.productRepo.findOne({
        where: { id: data.productId, isDeleted: false },
        select: ["id"],
      });
      if (!product) return { status: StatusCode.NOT_FOUND };
    }

    const { productId, ...rest } = data;
    this.repository.merge(category, rest);

    if (data.productId) {
      (category as any).product = product;
    }

    await this.repository.save(category);
    return { status: StatusCode.OK };
  }

  async deleteCategory(
    ids: string[] | string
  ): Promise<{ status: number; deletedCategoryIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const categories = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!categories.length)
      return { status: StatusCode.NOT_FOUND, deletedCategoryIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedCategoryIds: ids };
  }

  async recoverDeletedCategories(
    ids: string[] | string
  ): Promise<{ status: number; recoveredCount: number }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length)
      return { status: StatusCode.BAD_REQUEST, recoveredCount: 0 };

    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: false })
      .where("id IN (:...ids)", { ids: idList })
      .andWhere("isDeleted = true")
      .execute();

    return { status: StatusCode.OK, recoveredCount: result.affected || 0 };
  }

  async getDeletedCategories(
    page = 1,
    limit = 10,
    productId?: string,
    kind?: DownloadKind,
    search = "",
    isActive?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.product", "product")
      .leftJoinAndSelect(
        "category.items",
        "item",
        "item.isDeleted = false AND item.isActive = true"
      )
      .where("category.isDeleted = true");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (kind) {
      query.andWhere("category.kind = :kind", { kind });
    }

    if (search) {
      query.andWhere("category.title ILIKE :search", { search: `%${search}%` });
    }

    if (isActive !== undefined) {
      query.andWhere("category.isActive = :isActive", { isActive });
    }

    query
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.updatedAt", "DESC")
      .skip(skip)
      .take(limit);

    const [categories, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        categories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
