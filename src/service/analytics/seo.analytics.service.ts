import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { SeoMetadata } from "../../entities/seoMetadata.entity";
import { Not, IsNull } from "typeorm";

export class SeoAnalyticsService {
  private seoRepo = AppDataSource.getRepository(SeoMetadata);

  async getOverview(): Promise<{ status: number; data: object }> {
    const [totalRecords, optimized, indexable, withCanonical] = await Promise.all(
      [
        this.seoRepo.count({ where: { isDeleted: false } }),
        this.seoRepo.count({
          where: { isDeleted: false, isOptimized: true },
        }),
        this.seoRepo.count({
          where: { isDeleted: false, isIndexable: true },
        }),
        this.seoRepo.count({
          where: { isDeleted: false, canonicalUrl: Not(IsNull()) },
        }),
      ]
    );

    return {
      status: StatusCode.OK,
      data: {
        totalRecords,
        optimized,
        indexable,
        canonicalSet: withCanonical,
        optimizationCoverage: totalRecords
          ? Number(((optimized / totalRecords) * 100).toFixed(2))
          : 0,
      },
    };
  }

  async getEntityBreakdown(): Promise<{ status: number; data: object }> {
    const raw = await this.seoRepo
      .createQueryBuilder("seo")
      .select("seo.entityType", "entityType")
      .addSelect("COUNT(seo.id)", "count")
      .addSelect(
        "SUM(CASE WHEN seo.isOptimized THEN 1 ELSE 0 END)",
        "optimizedCount"
      )
      .where("seo.isDeleted = false")
      .groupBy("seo.entityType")
      .orderBy("count", "DESC")
      .getRawMany();

    const breakdown = raw.map((row) => ({
      entityType: row.entityType,
      count: Number(row.count) || 0,
      optimized: Number(row.optimizedCount) || 0,
    }));

    return { status: StatusCode.OK, data: { breakdown } };
  }

  async getRecentUpdates(
    limit = 10
  ): Promise<{ status: number; data: object }> {
    const records = await this.seoRepo.find({
      where: { isDeleted: false },
      order: { updatedAt: "DESC" },
      take: limit,
      select: [
        "id",
        "entityType",
        "entityId",
        "slug",
        "title",
        "isOptimized",
        "isIndexable",
        "updatedAt",
      ],
    });

    return { status: StatusCode.OK, data: { records } };
  }
}
