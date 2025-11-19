import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { UserMetadata } from "../../entities/userMetaData.entity";

export class UserAnalyticsService {
  private userMetadataRepo = AppDataSource.getRepository(UserMetadata);

  async getOverview(): Promise<{ status: number; data: object }> {
    const [totalRecords, uniqueUsers, uniqueIps, uniqueCountries] =
      await Promise.all([
        this.userMetadataRepo.count({ where: { isDeleted: false } }),
        this.userMetadataRepo
          .createQueryBuilder("meta")
          .select("COUNT(DISTINCT meta.userId)", "count")
          .where("meta.isDeleted = false")
          .andWhere("meta.userId IS NOT NULL")
          .getRawOne()
          .then((row) => Number(row?.count || 0)),
        this.userMetadataRepo
          .createQueryBuilder("meta")
          .select("COUNT(DISTINCT meta.ip)", "count")
          .where("meta.isDeleted = false")
          .andWhere("meta.ip IS NOT NULL")
          .getRawOne()
          .then((row) => Number(row?.count || 0)),
        this.userMetadataRepo
          .createQueryBuilder("meta")
          .select("COUNT(DISTINCT meta.country)", "count")
          .where("meta.isDeleted = false")
          .andWhere("meta.country IS NOT NULL")
          .getRawOne()
          .then((row) => Number(row?.count || 0)),
      ]);

    return {
      status: StatusCode.OK,
      data: {
        totalRecords,
        uniqueUsers,
        uniqueIps,
        uniqueCountries,
      },
    };
  }

  async getClientBreakdown(): Promise<{ status: number; data: object }> {
    const [browsersRaw, osRaw, devicesRaw] = await Promise.all([
      this.userMetadataRepo
        .createQueryBuilder("meta")
        .select("meta.browser", "browser")
        .addSelect("COUNT(meta.id)", "count")
        .where("meta.isDeleted = false")
        .groupBy("meta.browser")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany(),
      this.userMetadataRepo
        .createQueryBuilder("meta")
        .select("meta.os", "os")
        .addSelect("COUNT(meta.id)", "count")
        .where("meta.isDeleted = false")
        .groupBy("meta.os")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany(),
      this.userMetadataRepo
        .createQueryBuilder("meta")
        .select("meta.device", "device")
        .addSelect("COUNT(meta.id)", "count")
        .where("meta.isDeleted = false")
        .groupBy("meta.device")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany(),
    ]);

    const mapRows = (rows: any[], key: string) =>
      rows.map((row) => ({
        label: row[key] || "Unknown",
        count: Number(row.count) || 0,
      }));

    return {
      status: StatusCode.OK,
      data: {
        browsers: mapRows(browsersRaw, "browser"),
        operatingSystems: mapRows(osRaw, "os"),
        devices: mapRows(devicesRaw, "device"),
      },
    };
  }

  async getGeoDistribution(): Promise<{ status: number; data: object }> {
    const raw = await this.userMetadataRepo
      .createQueryBuilder("meta")
      .select("meta.country", "country")
      .addSelect("meta.region", "region")
      .addSelect("meta.city", "city")
      .addSelect("COUNT(meta.id)", "count")
      .where("meta.isDeleted = false")
      .groupBy("meta.country")
      .addGroupBy("meta.region")
      .addGroupBy("meta.city")
      .orderBy("count", "DESC")
      .limit(50)
      .getRawMany();

    const locations = raw.map((row) => ({
      country: row.country || "Unknown",
      region: row.region || null,
      city: row.city || null,
      count: Number(row.count) || 0,
    }));

    return { status: StatusCode.OK, data: { locations } };
  }

  async getCountryVisitors(): Promise<{
    status: number;
    data: Array<{ country_code: string; visitors: number }>;
  }> {
    const raw = await this.userMetadataRepo
      .createQueryBuilder("meta")
      .select("meta.country", "country")
      .addSelect("COUNT(DISTINCT meta.ip)", "visitors")
      .where("meta.isDeleted = false")
      .andWhere("meta.country IS NOT NULL")
      .andWhere("meta.country <> ''")
      .andWhere("meta.ip IS NOT NULL")
      .andWhere("meta.ip <> ''")
      .groupBy("meta.country")
      .orderBy("visitors", "DESC")
      .getRawMany();

    const countries = raw.map((row) => ({
      country_code: row.country,
      visitors: Number(row.visitors) || 0,
    }));

    return { status: StatusCode.OK, data: countries };
  }

  async getRecentActivity(
    limit = 20
  ): Promise<{ status: number; data: object }> {
    const records = await this.userMetadataRepo.find({
      where: { isDeleted: false },
      order: { createdAt: "DESC" },
      take: limit,
      select: [
        "id",
        "userId",
        "ip",
        "country",
        "city",
        "region",
        "os",
        "browser",
        "device",
        "createdAt",
      ],
    });

    return { status: StatusCode.OK, data: { records } };
  }
}
