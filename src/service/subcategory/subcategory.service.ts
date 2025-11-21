import { BaseService } from "../base.service";
import { SubCategory as SubCategoryEntity } from "../../entities/subcategory.entity";
import { ISubCategory } from "../../dto/subcategory/subcategory.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In, Like, Brackets } from "typeorm";
import { isUUID } from "class-validator";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Category } from "../../entities/category.entity";
import { Product } from "../../entities/product.entity";
import { deleteMedia } from "../../functions/deleteMedia";

export class SubCategory extends BaseService<SubCategoryEntity> {
  private categoryRepo = AppDataSource.getRepository(Category);
  private productRepo = AppDataSource.getRepository(Product);

  constructor() {
    super(SubCategoryEntity);
  }

  async createSubCategory(data: ISubCategory): Promise<{ status: number }> {
    const existing = await this.repository.findOne({
      where: [{ slug: data.slug }],
    });
    if (existing) return { status: StatusCode.ALREADY_EXIST };
    const category = await this.categoryRepo.findOne({
      where: { id: data.categoryId },
      select: ["id", "title", "slug"],
    });
    const subCategory = this.repository.create({
      title: data.title,
      slug: data.slug,
      category: category,
      coverImage: data.coverImage ?? undefined,
      description: data.description ?? undefined,
      sortOrder: await this.resolveSortOrder(data.sortOrder, {
        scope: category?.id ? { categoryId: category.id } : undefined,
      }),
    });

    await this.repository.save(subCategory);
    return { status: StatusCode.CREATED };
  }

  async getAllSubCategories(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("subCategory")
      .leftJoinAndSelect(
        "subCategory.category",
        "category",
        "category.isDeleted = false"
      )
      .where("subCategory.isDeleted = :isDeleted", { isDeleted: false })
      .orderBy("subCategory.sortOrder", "ASC")
      .addOrderBy("subCategory.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (search) {
      const searchParam = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where("subCategory.title ILIKE :search", { search: searchParam })
            .orWhere("subCategory.slug ILIKE :search", { search: searchParam })
            .orWhere("category.title ILIKE :search", { search: searchParam });
        })
      );
    }

    const [subCategories, total] = await query.getManyAndCount();

    const result = subCategories.map((sc) => ({
      id: sc.id,
      title: sc.title,
      slug: sc.slug,
      coverImage: sc.coverImage ?? null,
      category: sc.category
        ? {
            id: sc.category.id,
            title: sc.category.title,
            slug: sc.category.slug,
          }
        : null,
      createdAt: sc.createdAt,
    }));

    return {
      status: StatusCode.OK,
      data: {
        subCategories: result,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubCategoriesByCategory(
    categoryId: string,
    page = 1,
    limit = 10
  ): Promise<{ status: number; data?: object }> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, isDeleted: false },
      select: ["id", "title", "slug"],
    });

    if (!category) {
      return { status: StatusCode.NOT_FOUND };
    }

    const skip = (page - 1) * limit;

    const [subCategories, total] = await this.repository
      .createQueryBuilder("subCategory")
      .leftJoinAndSelect("subCategory.category", "category")
      .where("subCategory.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("category.id = :categoryId", { categoryId })
      .orderBy("subCategory.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const formatted = subCategories.map((sc) => ({
      ...sc,
      category: sc.category
        ? {
            id: sc.category.id,
            title: sc.category.title,
            slug: sc.category.slug,
          }
        : null,
    }));

    return {
      status: StatusCode.OK,
      data: {
        subCategories: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubCategoryById(
    identifier: string
  ): Promise<{ status: number; subCategory?: SubCategoryEntity }> {
    const query = this.repository
      .createQueryBuilder("subCategory")
      .leftJoinAndSelect("subCategory.category", "category")
      .where("subCategory.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("(category.id IS NULL OR category.isDeleted = false)");

    if (isUUID(identifier)) {
      query.andWhere("subCategory.id = :identifier", { identifier });
    } else {
      query.andWhere("subCategory.slug = :identifier", { identifier });
    }

    const subCategory = await query.getOne();

    if (!subCategory) return { status: StatusCode.NOT_FOUND };

    return { status: StatusCode.OK, subCategory };
  }

  async updateSubCategory(
    id: string,
    data: ISubCategory
  ): Promise<{ status: number }> {
    const subCategory = await this.repository.findOne({
      where: { id },
      relations: ["category"],
    });
    if (!subCategory) return { status: StatusCode.NOT_FOUND };

    const previousCoverImage = subCategory.coverImage ?? null;
    const incomingCoverImage =
      data.coverImage !== undefined ? data.coverImage ?? null : undefined;

    const updatePayload: Partial<SubCategoryEntity> = {
      title: data.title,
      slug: data.slug,
    };

    if (data.description !== undefined) {
      updatePayload.description = data.description ?? null;
    }

    if (incomingCoverImage !== undefined) {
      updatePayload.coverImage = incomingCoverImage;
    }

    const targetCategoryId =
      data.categoryId ?? subCategory.category?.id ?? undefined;

    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      updatePayload.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: subCategory.id,
        scope: targetCategoryId ? { categoryId: targetCategoryId } : undefined,
      });
    }

    if (data.categoryId !== undefined) {
      updatePayload.category = data.categoryId
        ? ({ id: data.categoryId } as Category)
        : null;
    }

    this.repository.merge(subCategory, updatePayload);

    await this.repository.save(subCategory);

    if (
      incomingCoverImage !== undefined &&
      previousCoverImage &&
      previousCoverImage !== incomingCoverImage
    ) {
      deleteMedia({ urls: previousCoverImage }).catch(() => undefined);
    }

    return { status: StatusCode.OK };
  }

  async deleteSubCategory(
    ids: string[] | string
  ): Promise<{ status: number; deletedSubCategoryIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const subCategories = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!subCategories.length)
      return { status: StatusCode.NOT_FOUND, deletedSubCategoryIds: [] };

    await this.productRepo
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true, subcategory: null })
      .where('"subcategoryId" IN (:...ids)', { ids })
      .execute();

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedSubCategoryIds: ids };
  }

  async hardDeleteSubCategories(ids: string[] | string): Promise<{
    status: number;
    deletedSubCategoryIds: string[];
    deletedAssets: number;
  }> {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length)
      return {
        status: StatusCode.BAD_REQUEST,
        deletedSubCategoryIds: [],
        deletedAssets: 0,
      };

    const subCategories = await this.repository.find({
      where: { id: In(ids), isDeleted: true },
      select: ["id", "coverImage"],
    });

    if (!subCategories.length)
      return {
        status: StatusCode.NOT_FOUND,
        deletedSubCategoryIds: [],
        deletedAssets: 0,
      };

    const subCategoryIds = subCategories.map((sc) => sc.id);
    const coverUrls = subCategories
      .map((sc) => sc.coverImage)
      .filter((url): url is string => Boolean(url));

    await this.productRepo
      .createQueryBuilder()
      .update()
      .set({ subcategory: null })
      .where('"subcategoryId" IN (:...ids)', { ids: subCategoryIds })
      .execute();

    await this.repository.delete({ id: In(subCategoryIds) });

    if (coverUrls.length) {
      deleteMedia({ urls: coverUrls }).catch(console.error);
    }

    return {
      status: StatusCode.OK,
      deletedSubCategoryIds: subCategoryIds,
      deletedAssets: coverUrls.length,
    };
  }

  async recoverDeletedSubCategories(
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

  async getDeletedSubCategories(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const where = search
      ? [
          { title: Like(`%${search}%`), isDeleted: true },
          { slug: Like(`%${search}%`), isDeleted: true },
        ]
      : { isDeleted: true };

    const [subCategories, total] = await this.repository.findAndCount({
      where,
      relations: ["category"],
      skip,
      take: limit,
      order: { updatedAt: "DESC" },
    });

    const formatted = subCategories.map((sc) => ({
      id: sc.id,
      title: sc.title,
      slug: sc.slug,
      category: sc.category
        ? {
            id: sc.category.id,
            title: sc.category.title,
            slug: sc.category.slug,
          }
        : null,
      coverImage: sc.coverImage ?? null,
      description: sc.description ?? null,
      deletedAt: sc.updatedAt,
    }));

    return {
      status: StatusCode.OK,
      data: {
        subCategories: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
