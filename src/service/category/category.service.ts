import { BaseService } from "../base.service";
import { Category as CategoryEntity } from "../../entities/category.entity";
import { ICategory } from "../../dto/category/category.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In, Brackets } from "typeorm";
import { isUUID } from "class-validator";
import { AppDataSource } from "../../configs/psqlDb.config";
import { SubCategory } from "../../entities/subcategory.entity";
import { Product } from "../../entities/product.entity";
import { deleteMedia } from "../../functions/deleteMedia";
import { SeoEntityType } from "../../constant/enum.constant";
import { SeoMetadataService } from "../seo-metadata/seo-metadata.service";

export class Category extends BaseService<CategoryEntity> {
  private subCategoryRepo = AppDataSource.getRepository(SubCategory);
  private productRepo = AppDataSource.getRepository(Product);
  private seoMetadataService = new SeoMetadataService();
  constructor() {
    super(CategoryEntity);
  }

  private async loadSubCategoriesFor(
    categoryIds: string[]
  ): Promise<Record<string, Array<{ id: string; title: string; slug: string; coverImage: string | null; sortOrder: number }>>> {
    if (!categoryIds.length) return {};

    const rows = await this.subCategoryRepo
      .createQueryBuilder("subCategory")
      .select([
        "subCategory.id",
        "subCategory.title",
        "subCategory.slug",
        "subCategory.coverImage",
        "subCategory.sortOrder",
        "subCategory.categoryId",
      ])
      .where("subCategory.isDeleted = false")
      .andWhere("subCategory.categoryId IN (:...categoryIds)", {
        categoryIds,
      })
      .orderBy("subCategory.categoryId", "ASC")
      .addOrderBy("subCategory.sortOrder", "ASC")
      .addOrderBy("subCategory.title", "ASC")
      .getRawMany();

    const map: Record<
      string,
      Array<{ id: string; title: string; slug: string; coverImage: string | null; sortOrder: number }>
    > = {};

    rows.forEach((row: any) => {
      const categoryId = row.subCategory_categoryId;
      const subCategoryData = {
        id: row.subCategory_id,
        title: row.subCategory_title,
        slug: row.subCategory_slug,
        coverImage: row.subCategory_coverImage ?? null,
        sortOrder: row.subCategory_sortOrder,
      };
      if (!map[categoryId]) {
        map[categoryId] = [];
      }
      map[categoryId].push(subCategoryData);
    });

    return map;
  }

  async createCategory(data: ICategory): Promise<{ status: number }> {
    const existing = await this.repository.findOne({
      where: [{ slug: data.slug }],
    });
    if (existing) return { status: StatusCode.ALREADY_EXIST };
    const sortOrder = await this.resolveSortOrder(data.sortOrder);
    const category = this.repository.create({
      title: data.title,
      slug: data.slug,
      coverImage: data.coverImage ?? undefined,
      description: data.description ?? undefined,
      sortOrder,
    });

    await this.repository.save(category);
    return { status: StatusCode.CREATED };
  }

  async getAllCategories(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("category")
      .select([
        "category.id",
        "category.title",
        "category.slug",
        "category.coverImage",
      ])
      .addSelect("category.createdAt")
      .addSelect("category.sortOrder")
      .where("category.isDeleted = :isDeleted", { isDeleted: false });

    if (search) {
      query.andWhere(
        "category.title ILIKE :search OR category.slug ILIKE :search",
        { search: `%${search}%` }
      );
    }

    const [categories, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.createdAt", "DESC")
      .getManyAndCount();

    const seoMetadataMap = await this.seoMetadataService.getSeoMetadataMap(
      SeoEntityType.CATEGORY,
      categories.map((category) => category.id)
    );

    const subCategoryMap = await this.loadSubCategoriesFor(
      categories.map((category) => category.id)
    );

    const categoriesWithSeo = categories.map((category) => {
      const plain = JSON.parse(JSON.stringify(category));
      plain.seoMetadata = seoMetadataMap[category.id] ?? null;
      plain.subCategories = (subCategoryMap[category.id] ?? []).map(
        ({ sortOrder, ...rest }) => rest
      );
      return plain;
    });

    return {
      status: StatusCode.OK,
      data: {
        categories: categoriesWithSeo,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryById(
    identifier: string
  ): Promise<{ status: number; category?: CategoryEntity }> {
    const query = this.repository
      .createQueryBuilder("category")
      .where("category.isDeleted = :isDeleted", { isDeleted: false });

    if (isUUID(identifier)) {
      query.andWhere("category.id = :identifier", { identifier });
    } else {
      query.andWhere("category.slug = :identifier", { identifier });
    }

    const category = await query.getOne();

    if (!category) return { status: StatusCode.NOT_FOUND };

    const subCategoryMap = await this.loadSubCategoriesFor([category.id]);
    const seoMetadata = await this.seoMetadataService.getSeoMetadataForEntity(
      SeoEntityType.CATEGORY,
      category.id
    );

    const categoryPlain = JSON.parse(JSON.stringify(category));
    categoryPlain.subCategories = (subCategoryMap[category.id] ?? []).map(
      ({ sortOrder, ...rest }) => rest
    );
    categoryPlain.seoMetadata = seoMetadata;

    return { status: StatusCode.OK, category: categoryPlain };
  }

  async updateCategory(
    id: string,
    data: ICategory
  ): Promise<{ status: number }> {
    const category = await this.repository.findOne({
      where: { id },
    });
    if (!category) return { status: StatusCode.NOT_FOUND };

    const previousCoverImage = category.coverImage ?? null;
    const incomingCoverImage =
      data.coverImage !== undefined ? data.coverImage ?? null : undefined;

    const updatePayload: Partial<CategoryEntity> = {
      title: data.title,
      slug: data.slug,
    };

    if (data.description !== undefined) {
      updatePayload.description = data.description ?? null;
    }

    if (incomingCoverImage !== undefined) {
      updatePayload.coverImage = incomingCoverImage;
    }

    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      updatePayload.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: category.id,
      });
    }

    this.repository.merge(category, updatePayload);

    await this.repository.save(category);

    if (
      incomingCoverImage !== undefined &&
      previousCoverImage &&
      previousCoverImage !== incomingCoverImage
    ) {
      deleteMedia({ urls: previousCoverImage }).catch(() => undefined);
    }

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

    const subCategories = await this.subCategoryRepo.find({
      where: { category: { id: In(ids) }, isDeleted: false },
      select: ["id"],
    });

    const subCategoryIds = subCategories.map((sc) => sc.id);

    if (subCategoryIds.length) {
      await this.subCategoryRepo
        .createQueryBuilder()
        .update()
        .set({ isDeleted: true })
        .where("id IN (:...subCategoryIds)", { subCategoryIds })
        .execute();

      await this.productRepo
        .createQueryBuilder()
        .update()
        .set({ isDeleted: true, subcategory: null })
        .where('"subcategoryId" IN (:...subCategoryIds)', {
          subCategoryIds,
        })
        .execute();
    }

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedCategoryIds: ids };
  }

  async hardDeleteCategories(
    ids: string[] | string
  ): Promise<{
    status: number;
    deletedCategoryIds: string[];
    deletedAssets: number;
  }> {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length)
      return {
        status: StatusCode.BAD_REQUEST,
        deletedCategoryIds: [],
        deletedAssets: 0,
      };

    const categories = await this.repository.find({
      where: { id: In(ids), isDeleted: true },
      select: ["id", "coverImage"],
    });

    if (!categories.length) {
      return {
        status: StatusCode.NOT_FOUND,
        deletedCategoryIds: [],
        deletedAssets: 0,
      };
    }

    const categoryIds = categories.map((category) => category.id);
    const coverUrls = categories
      .map((category) => category.coverImage)
      .filter((url): url is string => Boolean(url));

    await this.repository.delete({ id: In(categoryIds) });

    if (coverUrls.length) {
      deleteMedia({ urls: coverUrls }).catch(console.error);
    }

    return {
      status: StatusCode.OK,
      deletedCategoryIds: categoryIds,
      deletedAssets: coverUrls.length,
    };
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
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("category")
      .where("category.isDeleted = :isDeleted", { isDeleted: true });

    if (search) {
      const searchParam = `%${search}%`;
      query.andWhere(
        new Brackets((qb) =>
          qb
            .orWhere("category.title ILIKE :search", { search: searchParam })
            .orWhere("category.slug ILIKE :search", { search: searchParam })
        )
      );
    }

    const [categories, total] = await query
      .orderBy("category.updatedAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const formatted = categories.map((category) => ({
      id: category.id,
      title: category.title,
      slug: category.slug,
      coverImage: category.coverImage ?? null,
      description: category.description ?? null,
      deletedAt: category.updatedAt,
    }));

    return {
      status: StatusCode.OK,
      data: {
        categories: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
