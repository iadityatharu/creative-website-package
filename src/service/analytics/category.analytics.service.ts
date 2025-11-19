import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Category } from "../../entities/category.entity";
import { Product } from "../../entities/product.entity";
import { SubCategory } from "../../entities/subcategory.entity";

export class CategoryAnalyticsService {
  private categoryRepo = AppDataSource.getRepository(Category);
  private productRepo = AppDataSource.getRepository(Product);
  private subCategoryRepo = AppDataSource.getRepository(SubCategory);

  async getOverview(): Promise<{ status: number; data: object }> {
    const [
      totalCategories,
      categoriesWithSubCategories,
      categoriesWithProducts,
    ] = await Promise.all([
      this.categoryRepo.count({ where: { isDeleted: false } }),
      this.subCategoryRepo
        .createQueryBuilder("sub")
        .select("COUNT(DISTINCT sub.categoryId)", "count")
        .where("sub.isDeleted = false")
        .getRawOne()
        .then((row) => Number(row?.count || 0)),
      this.productRepo
        .createQueryBuilder("product")
        .leftJoin("product.subcategory", "sub")
        .select("COUNT(DISTINCT sub.categoryId)", "count")
        .where("product.isDeleted = false")
        .getRawOne()
        .then((row) => Number(row?.count || 0)),
    ]);

    return {
      status: StatusCode.OK,
      data: {
        totalCategories,
        categoriesWithSubCategories,
        categoriesWithProducts,
      },
    };
  }

  async getTopCategories(limit = 5): Promise<{ status: number; data: object }> {
    const raw = await this.categoryRepo
      .createQueryBuilder("category")
      .leftJoin("category.subCategories", "sub")
      .leftJoin("sub.products", "product", "product.isDeleted = false")
      .where("category.isDeleted = false")
      .select([
        "category.id AS id",
        "category.title AS title",
        "category.slug AS slug",
        "COUNT(DISTINCT sub.id) AS subcategoryCount",
        "COUNT(product.id) AS productCount",
      ])
      .groupBy("category.id")
      .orderBy("productCount", "DESC")
      .addOrderBy("subcategoryCount", "DESC")
      .limit(limit)
      .getRawMany();

    const categories = raw.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      subcategoryCount: Number(row.subcategoryCount) || 0,
      productCount: Number(row.productCount) || 0,
    }));

    return { status: StatusCode.OK, data: { categories } };
  }

  async getCategoryPerformance(
    id: string
  ): Promise<{ status: number; data?: object }> {
    const category = await this.categoryRepo.findOne({
      where: { id, isDeleted: false },
      relations: ["subCategories"],
    });

    if (!category) return { status: StatusCode.NOT_FOUND };

    const [productTotals, popularProducts, publishedProducts, subStats] =
      await Promise.all([
        this.productRepo.count({
          where: {
            isDeleted: false,
            subcategory: { category: { id } },
          },
        }),
        this.productRepo.count({
          where: {
            isDeleted: false,
            isPopular: true,
            subcategory: { category: { id } },
          },
        }),
        this.productRepo.count({
          where: {
            isDeleted: false,
            isPublished: true,
            subcategory: { category: { id } },
          },
        }),
        this.productRepo
          .createQueryBuilder("product")
          .leftJoin("product.subcategory", "sub")
          .select([
            "sub.id AS id",
            "sub.title AS title",
            "COUNT(product.id) AS productCount",
            "SUM(CASE WHEN product.isPopular THEN 1 ELSE 0 END) AS popularCount",
            "SUM(CASE WHEN product.isPublished THEN 1 ELSE 0 END) AS publishedCount",
          ])
          .where("product.isDeleted = false")
          .andWhere("sub.categoryId = :categoryId", { categoryId: id })
          .groupBy("sub.id")
          .orderBy("productCount", "DESC")
          .getRawMany(),
      ]);

    const latestProducts = await this.productRepo.find({
      where: {
        isDeleted: false,
        subcategory: { category: { id } },
      },
      order: { createdAt: "DESC" },
      take: 5,
      select: [
        "id",
        "name",
        "slug",
        "model",
        "price",
        "isPopular",
        "isPublished",
        "createdAt",
      ],
    });

    const subcategoryBreakdown = subStats.map((row) => ({
      id: row.id,
      title: row.title,
      productCount: Number(row.productCount) || 0,
      popularCount: Number(row.popularCount) || 0,
      publishedCount: Number(row.publishedCount) || 0,
    }));

    return {
      status: StatusCode.OK,
      data: {
        category: {
          id: category.id,
          title: category.title,
          slug: category.slug,
          subcategoryCount: category.subCategories?.length || 0,
        },
        totals: {
          products: productTotals,
          published: publishedProducts,
          popular: popularProducts,
        },
        latestProducts,
        subcategoryBreakdown,
      },
    };
  }
}
