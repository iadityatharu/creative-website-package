import { BaseService } from "../base.service";
import { Product as ProductEntity } from "../../entities/product.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import {
  Brackets,
  IsNull,
  MoreThanOrEqual,
  Not,
} from "typeorm";
import {
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export class ProductAdmin extends BaseService<ProductEntity> {
  constructor() {
    super(ProductEntity);
  }

  async getProductStats(): Promise<{ status: number; data: object }> {
    const now = new Date();
    const startToday = startOfDay(now);
    const startMonth = startOfMonth(now);
    const startYear = startOfYear(now);
    const last7Days = subDays(now, 7);
    const last6Months = subMonths(now, 6);

    const [
      totalProducts,
      published,
      unpublished,
      popular,
      manualAssets,
      brochureAssets,
      seoOptimized,
    ] = await Promise.all([
      this.repository.count({ where: { isDeleted: false } }),
      this.repository.count({
        where: { isPublished: true, isDeleted: false },
      }),
      this.repository.count({
        where: { isPublished: false, isDeleted: false },
      }),
      this.repository.count({
        where: { isPopular: true, isDeleted: false },
      }),
      this.repository.count({
        where: { manualUrl: Not(IsNull()), isDeleted: false },
      }),
      this.repository.count({
        where: { brochureUrl: Not(IsNull()), isDeleted: false },
      }),
      this.repository.count({
        where: [
          {
            metaTitle: Not(IsNull()),
            isDeleted: false,
          },
          {
            metadescription: Not(IsNull()),
            isDeleted: false,
          },
        ],
      }),
    ]);

    const [todayCount, monthCount, yearCount] = await Promise.all([
      this.repository.count({
        where: { createdAt: MoreThanOrEqual(startToday), isDeleted: false },
      }),
      this.repository.count({
        where: { createdAt: MoreThanOrEqual(startMonth), isDeleted: false },
      }),
      this.repository.count({
        where: { createdAt: MoreThanOrEqual(startYear), isDeleted: false },
      }),
    ]);

    const priceStats = await this.repository
      .createQueryBuilder("p")
      .select("AVG(p.price)", "avgPrice")
      .addSelect("AVG(p.mrp)", "avgMrp")
      .addSelect("MIN(p.price)", "minPrice")
      .addSelect("MAX(p.price)", "maxPrice")
      .addSelect("MIN(p.mrp)", "minMrp")
      .addSelect("MAX(p.mrp)", "maxMrp")
      .where("p.isDeleted = false")
      .getRawOne();

    const dailyTrend = await this.repository
      .createQueryBuilder("product")
      .select("DATE(product.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("product.createdAt >= :last7Days", { last7Days })
      .andWhere("product.isDeleted = false")
      .groupBy("DATE(product.createdAt)")
      .orderBy("DATE(product.createdAt)", "ASC")
      .getRawMany();

    const monthlyTrend = await this.repository
      .createQueryBuilder("product")
      .select("TO_CHAR(product.createdAt, 'YYYY-MM')", "month")
      .addSelect("COUNT(*)", "count")
      .where("product.createdAt >= :last6Months", { last6Months })
      .andWhere("product.isDeleted = false")
      .groupBy("TO_CHAR(product.createdAt, 'YYYY-MM')")
      .orderBy("month", "ASC")
      .getRawMany();

    const topSubCategories = await this.repository
      .createQueryBuilder("product")
      .leftJoin("product.subcategory", "subcategory")
      .select("subcategory.title", "subcategory")
      .addSelect("COUNT(product.id)", "count")
      .where("product.isDeleted = false")
      .groupBy("subcategory.title")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

    const categoryBreakdownRaw = await this.repository
      .createQueryBuilder("product")
      .leftJoin("product.subcategory", "subcategory")
      .leftJoin("subcategory.category", "category")
      .select("category.id", "id")
      .addSelect("category.title", "category")
      .addSelect("COUNT(product.id)", "count")
      .addSelect(
        "SUM(CASE WHEN product.isPopular THEN 1 ELSE 0 END)",
        "popularCount"
      )
      .where("product.isDeleted = false")
      .groupBy("category.id")
      .addGroupBy("category.title")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

    const categoryBreakdown = categoryBreakdownRaw.map((row) => ({
      id: row.id ?? "uncategorized",
      category: row.category ?? "Uncategorized",
      count: Number(row.count) || 0,
      popularCount: Number(row.popularCount) || 0,
    }));

    return {
      status: StatusCode.OK,
      data: {
        totalProducts,
        published,
        unpublished,
        popular,
        assets: {
          manual: manualAssets,
          brochure: brochureAssets,
        },
        todayCount,
        monthCount,
        yearCount,
        avgPrice: Number(priceStats?.avgPrice || 0).toFixed(2),
        avgMrp: Number(priceStats?.avgMrp || 0).toFixed(2),
        priceRange: {
          minPrice: Number(priceStats?.minPrice || 0),
          maxPrice: Number(priceStats?.maxPrice || 0),
          minMrp: Number(priceStats?.minMrp || 0),
          maxMrp: Number(priceStats?.maxMrp || 0),
        },
        seoOptimized,
        seoCoverage: totalProducts
          ? Number(((seoOptimized / totalProducts) * 100).toFixed(2))
          : 0,
        topSubCategories,
        categoryBreakdown,
        dailyTrend,
        monthlyTrend,
      },
    };
  }

  async recoverDeletedProducts(
    id: string[] | string
  ): Promise<{ status: number; recoveredCount: number }> {
    const ids = Array.isArray(id) ? id : [id];
    if (!ids.length)
      return { status: StatusCode.BAD_REQUEST, recoveredCount: 0 };

    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: false })
      .where("id IN (:...ids)", { ids })
      .andWhere("isDeleted = true")
      .returning("id")
      .execute();

    const recoveredCount = result.affected || 0;
    return { status: StatusCode.OK, recoveredCount };
  }

  async getAllDeletedProducts(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("product")
      .leftJoin("product.subcategory", "subcategory")
      .leftJoin("subcategory.category", "category")
      .where("product.isDeleted = true");

    if (search) {
      const searchParam = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb
            .orWhere("COALESCE(product.name, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.sku, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.slug, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.model, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.manualUrl, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.brochureUrl, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.shortDescription, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.description, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.technology, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.metaTitle, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.metadescription, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.metatag::text, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.feature::text, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(CAST(product.price AS TEXT), '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(CAST(product.mrp AS TEXT), '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(subcategory.title, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(subcategory.slug, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(category.title, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(category.slug, '') ILIKE :search", {
              search: searchParam,
            });
        })
      );
    }

    const [products, total] = await query
      .orderBy("product.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      model: product.model,
      subcategory: product.subcategory
        ? {
            id: product.subcategory.id,
            title: product.subcategory.title,
            slug: product.subcategory.slug,
          }
        : null,
      price: product.price,
      yearlyPrice: product.yearlyPrice,
      mrp: product.mrp,
      isPublished: product.isPublished,
      isPopular: product.isPopular,
      deletedAt: product.updatedAt,
    }));

    return {
      status: StatusCode.OK,
      data: {
        products: formattedProducts,
        total,
        page,
        limit,
        totalPages: limit ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
