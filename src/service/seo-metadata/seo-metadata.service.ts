import { In, Not } from "typeorm";
import { BaseService } from "../base.service";
import { SeoMetadata } from "../../entities/seoMetadata.entity";
import { ISeoMetadata } from "../../dto/seo-metadata/seo-metadata.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { SeoEntityType } from "../../constant/enum.constant";
import { deleteCache, getCache, setCache } from "../../utils/redisClient";
import { deleteMedia } from "../../functions/deleteMedia";

export class SeoMetadataService extends BaseService<SeoMetadata> {
  private readonly cacheTTLSeconds = 60 * 24 * 60 * 60;
  private readonly notFoundFlag = "seo-not-found";

  constructor() {
    super(SeoMetadata);
  }

  private collectAssetUrls(record: SeoMetadata): string[] {
    const urls: string[] = [];
    const openGraphImages = record.openGraph?.images ?? [];
    (openGraphImages || []).forEach((image) => {
      if (image?.url) urls.push(image.url);
    });

    const twitterImages = record.twitter?.images ?? [];
    (twitterImages || []).forEach((image) => {
      if (image) urls.push(image);
    });

    if (record.sitemapUrl) urls.push(record.sitemapUrl);
    if (record.manifestUrl) urls.push(record.manifestUrl);

    return urls.filter(Boolean);
  }

  private buildCacheKey(entityType: SeoEntityType, entityId: string) {
    return `seo:${entityType}:${entityId}`;
  }

  private buildSiteCacheKey() {
    return "seo:site";
  }

  private toPlain(metadata: SeoMetadata): ISeoMetadata {
    return {
      id: metadata.id,
      entityType: metadata.entityType ?? undefined,
      entityId: metadata.entityId ?? undefined,
      slug: metadata.slug ?? undefined,
      title: metadata.title ?? undefined,
      description: metadata.description ?? undefined,
      keywords: metadata.keywords ?? null,
      canonicalUrl: metadata.canonicalUrl ?? undefined,
      openGraph: metadata.openGraph ?? null,
      twitter: metadata.twitter ?? null,
      robots: metadata.robots ?? null,
      alternates: metadata.alternates ?? null,
      jsonLd: metadata.jsonLd ?? null,
      extraMeta: metadata.extraMeta ?? null,
      isIndexable: metadata.isIndexable,
      isOptimized: metadata.isOptimized,
      sitemapUrl: metadata.sitemapUrl ?? undefined,
      manifestUrl: metadata.manifestUrl ?? undefined,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    };
  }

  private sanitizeKeywords(
    keywords: ISeoMetadata["keywords"]
  ): string[] | null | undefined {
    if (keywords === undefined) return undefined;
    if (keywords === null) return null;
    return keywords;
  }

  private async writeCache(
    entityType: SeoEntityType,
    entityId: string,
    payload: ISeoMetadata | { [key: string]: any }
  ) {
    const cacheKey = this.buildCacheKey(entityType, entityId);
    await setCache(cacheKey, payload, this.cacheTTLSeconds);
  }

  private async writeSiteCache(payload: ISeoMetadata | null) {
    await setCache(this.buildSiteCacheKey(), payload, this.cacheTTLSeconds);
  }

  private async markNotFoundCache(entityType: SeoEntityType, entityId: string) {
    await this.writeCache(entityType, entityId, { [this.notFoundFlag]: true });
  }

  private parseCachedValue(cached: unknown): ISeoMetadata | null | undefined {
    if (cached === null || cached === undefined) return undefined;

    let payload: any = cached;
    if (typeof cached === "string") {
      try {
        payload = JSON.parse(cached);
      } catch {
        return undefined;
      }
    }

    if (
      payload &&
      typeof payload === "object" &&
      this.notFoundFlag in payload
    ) {
      return null;
    }

    return payload as ISeoMetadata;
  }

  private baseNotDeletedQuery(alias = "seo") {
    return this.repository
      .createQueryBuilder(alias)
      .where(`${alias}.isDeleted = false`);
  }

  private async readCache(
    entityType: SeoEntityType,
    entityId: string
  ): Promise<ISeoMetadata | null | undefined> {
    const cacheKey = this.buildCacheKey(entityType, entityId);
    const cached = await getCache(cacheKey);
    return this.parseCachedValue(cached);
  }

  private async readSiteCache(): Promise<ISeoMetadata | null | undefined> {
    const cached = await getCache(this.buildSiteCacheKey());
    return this.parseCachedValue(cached);
  }

  async createSeoMetadata(data: ISeoMetadata): Promise<{ status: number }> {
    if (!data.entityType && !data.entityId) {
      return this.upsertSiteSeo(data);
    }

    const hasEntityType =
      data.entityType !== undefined && data.entityType !== null;
    const hasEntityId = data.entityId !== undefined && data.entityId !== null;

    if (hasEntityType !== hasEntityId) {
      return { status: StatusCode.BAD_REQUEST };
    }

    const existing = await this.repository.findOne({
      where: {
        entityType: data.entityType,
        entityId: data.entityId,
        isDeleted: false,
      },
    });

    if (existing) {
      return { status: StatusCode.ALREADY_EXIST };
    }

    const sanitizedKeywords = this.sanitizeKeywords(data.keywords);
    const createPayload: Partial<SeoMetadata> = {
      ...data,
    };

    if (sanitizedKeywords === undefined) {
      delete (createPayload as any).keywords;
    } else {
      (createPayload as any).keywords = sanitizedKeywords;
    }

    const seoMetadata = this.repository.create(createPayload);

    await this.repository.save(seoMetadata);

    const plain = this.toPlain(seoMetadata);
    await this.writeCache(data.entityType, data.entityId, plain);
    await this.writeSiteCache(await this.loadSiteSeo());

    return {
      status: StatusCode.CREATED,
    };
  }

  async getAllSeoMetadata(
    page = 1,
    limit = 10,
    entityType?: SeoEntityType,
    search = "",
    isIndexable?: boolean,
    isOptimized?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.baseNotDeletedQuery()
      .orderBy("seo.updatedAt", "DESC")
      .skip(skip)
      .take(limit);

    if (entityType) {
      query.andWhere("seo.entityType = :entityType", { entityType });
    }

    if (isIndexable !== undefined) {
      query.andWhere("seo.isIndexable = :isIndexable", { isIndexable });
    }

    if (isOptimized !== undefined) {
      query.andWhere("seo.isOptimized = :isOptimized", { isOptimized });
    }

    if (search) {
      query.andWhere(
        `(
          COALESCE(seo.slug, '') ILIKE :search OR
          COALESCE(seo.title, '') ILIKE :search OR
          COALESCE(seo.description, '') ILIKE :search OR
          array_to_string(COALESCE(seo.keywords, ARRAY[]::text[]), ',') ILIKE :search OR
          COALESCE(seo.canonicalUrl, '') ILIKE :search
        )`,
        { search: `%${search}%` }
      );
    }

    const [records, total] = await query.getManyAndCount();
    const plainRecords = records.map((record) => this.toPlain(record));

    return {
      status: StatusCode.OK,
      data: {
        records: plainRecords,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSeoMetadataById(
    id: string
  ): Promise<{ status: number; seoMetadata?: ISeoMetadata }> {
    const seoMetadata = await this.baseNotDeletedQuery()
      .andWhere("seo.id = :id", { id })
      .getOne();

    if (!seoMetadata) {
      return { status: StatusCode.NOT_FOUND };
    }

    return { status: StatusCode.OK, seoMetadata: this.toPlain(seoMetadata) };
  }

  async updateSeoMetadata(
    id: string,
    data: ISeoMetadata
  ): Promise<{ status: number; seoMetadata?: ISeoMetadata }> {
    const seoMetadata = await this.repository.findOne({
      where: { id, isDeleted: false },
    });

    if (!seoMetadata) {
      return { status: StatusCode.NOT_FOUND };
    }

    const previousEntityType = seoMetadata.entityType;
    const previousEntityId = seoMetadata.entityId;
    const nextEntityType = data.entityType ?? seoMetadata.entityType;
    const nextEntityId = data.entityId ?? seoMetadata.entityId;

    const sanitizedKeywords = this.sanitizeKeywords(data.keywords);
    const basePayload: Partial<SeoMetadata> = { ...data };

    if (sanitizedKeywords === undefined) {
      delete (basePayload as any).keywords;
    } else {
      (basePayload as any).keywords = sanitizedKeywords;
    }

    if (basePayload.entityType === undefined) {
      delete basePayload.entityType;
    }
    if (basePayload.entityId === undefined) {
      delete basePayload.entityId;
    }

    if (!nextEntityType && !nextEntityId) {
      const sitePayload: Partial<SeoMetadata> = {
        ...basePayload,
        entityType: null,
        entityId: null,
      };

      this.repository.merge(seoMetadata, sitePayload);
      const updatedSite = await this.repository.save(seoMetadata);
      const plainSite = this.toPlain(updatedSite);

      if (previousEntityType && previousEntityId) {
        await deleteCache(
          this.buildCacheKey(previousEntityType, previousEntityId)
        );
      }

      await this.writeSiteCache(plainSite);
      return { status: StatusCode.OK, seoMetadata: plainSite };
    }

    if (nextEntityType && nextEntityId) {
      const duplicate = await this.repository.findOne({
        where: {
          entityType: nextEntityType,
          entityId: nextEntityId,
          isDeleted: false,
          id: Not(id),
        },
      });

      if (duplicate) {
        return { status: StatusCode.ALREADY_EXIST };
      }
    }

    const updatePayload: Partial<SeoMetadata> = { ...basePayload };

    this.repository.merge(seoMetadata, updatePayload);
    const updated = await this.repository.save(seoMetadata);
    const plain = this.toPlain(updated);

    if (
      previousEntityType &&
      previousEntityId &&
      (previousEntityType !== nextEntityType ||
        previousEntityId !== nextEntityId)
    ) {
      await deleteCache(
        this.buildCacheKey(previousEntityType, previousEntityId)
      );
    }

    if (nextEntityType && nextEntityId) {
      await this.writeCache(nextEntityType, nextEntityId, plain);
    }

    await this.writeSiteCache(await this.loadSiteSeo());

    return { status: StatusCode.OK, seoMetadata: plain };
  }

  async deleteSeoMetadata(
    ids: string[] | string
  ): Promise<{ status: number; deletedIds: string[] }> {
    const idList = Array.isArray(ids) ? ids : [ids];

    if (!idList.length) {
      return { status: StatusCode.BAD_REQUEST, deletedIds: [] };
    }

    const records = await this.repository.find({
      where: { id: In(idList), isDeleted: false },
      select: ["id", "entityType", "entityId"],
    });

    if (!records.length) {
      return { status: StatusCode.NOT_FOUND, deletedIds: [] };
    }

    const recordIds = records.map((record) => record.id);

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids: recordIds })
      .execute();

    await Promise.all(
      records
        .filter((record) => record.entityType && record.entityId)
        .map((record) =>
          deleteCache(
            this.buildCacheKey(
              record.entityType as SeoEntityType,
              record.entityId as string
            )
          )
        )
    );

    await this.writeSiteCache(await this.loadSiteSeo());

    return { status: StatusCode.OK, deletedIds: recordIds };
  }

  async hardDeleteSeoMetadata(
    ids: string[] | string
  ): Promise<{ status: number; deletedIds: string[]; deletedAssets: number }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length) {
      return { status: StatusCode.BAD_REQUEST, deletedIds: [], deletedAssets: 0 };
    }

    const records = await this.repository.find({
      where: { id: In(idList) },
    });

    if (!records.length) {
      return { status: StatusCode.NOT_FOUND, deletedIds: [], deletedAssets: 0 };
    }

    const recordIds = records.map((record) => record.id);
    const assets = records.flatMap((record) => this.collectAssetUrls(record));

    await this.repository.delete({ id: In(recordIds) });

    if (assets.length) {
      deleteMedia({ urls: assets }).catch(console.error);
    }

    await Promise.all(
      records
        .filter(
          (record) =>
            record.entityType !== undefined &&
            record.entityType !== null &&
            record.entityId
        )
        .map((record) =>
          deleteCache(
            this.buildCacheKey(
              record.entityType as SeoEntityType,
              record.entityId as string
            )
          )
        )
    );

    await this.writeSiteCache(await this.loadSiteSeo());

    return {
      status: StatusCode.OK,
      deletedIds: recordIds,
      deletedAssets: assets.length,
    };
  }

  async recoverDeletedSeoMetadata(
    ids: string[] | string
  ): Promise<{ status: number; recoveredCount: number }> {
    const idList = Array.isArray(ids) ? ids : [ids];

    if (!idList.length) {
      return { status: StatusCode.BAD_REQUEST, recoveredCount: 0 };
    }

    const records = await this.repository.find({
      where: { id: In(idList), isDeleted: true },
      select: ["id"],
    });

    if (!records.length) {
      return { status: StatusCode.NOT_FOUND, recoveredCount: 0 };
    }

    const recordIds = records.map((record) => record.id);

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: false })
      .where("id IN (:...ids)", { ids: recordIds })
      .execute();

    const updatedRecords = await this.repository.find({
      where: { id: In(recordIds) },
    });

    await Promise.all(
      updatedRecords
        .filter(
          (record) =>
            record.entityType !== null &&
            record.entityId !== null &&
            record.entityType !== undefined &&
            record.entityId !== undefined
        )
        .map((record) =>
          this.writeCache(
            record.entityType as SeoEntityType,
            record.entityId as string,
            this.toPlain(record)
          )
        )
    );

    await this.writeSiteCache(await this.loadSiteSeo());

    return { status: StatusCode.OK, recoveredCount: recordIds.length };
  }

  async getDeletedSeoMetadata(
    page = 1,
    limit = 10,
    entityType?: SeoEntityType,
    search = "",
    isIndexable?: boolean,
    isOptimized?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("seo")
      .where("seo.isDeleted = true")
      .orderBy("seo.updatedAt", "DESC")
      .skip(skip)
      .take(limit);

    if (entityType) {
      query.andWhere("seo.entityType = :entityType", { entityType });
    }

    if (isIndexable !== undefined) {
      query.andWhere("seo.isIndexable = :isIndexable", { isIndexable });
    }

    if (isOptimized !== undefined) {
      query.andWhere("seo.isOptimized = :isOptimized", { isOptimized });
    }

    if (search) {
      query.andWhere(
        `(
          COALESCE(seo.slug, '') ILIKE :search OR
          COALESCE(seo.title, '') ILIKE :search OR
          COALESCE(seo.description, '') ILIKE :search OR
          array_to_string(COALESCE(seo.keywords, ARRAY[]::text[]), ',') ILIKE :search OR
          COALESCE(seo.canonicalUrl, '') ILIKE :search
        )`,
        { search: `%${search}%` }
      );
    }

    const [records, total] = await query.getManyAndCount();
    const plainRecords = records.map((record) => this.toPlain(record));

    return {
      status: StatusCode.OK,
      data: {
        records: plainRecords,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSeoMetadataForEntity(
    entityType: SeoEntityType,
    entityId: string
  ): Promise<ISeoMetadata | null> {
    if (!entityId) return null;

    const cached = await this.readCache(entityType, entityId);
    if (cached !== undefined) {
      return cached;
    }

    const record = await this.repository.findOne({
      where: {
        entityType,
        entityId,
        isDeleted: false,
      },
    });

    if (!record) {
      await this.markNotFoundCache(entityType, entityId);
      return null;
    }

    const plain = this.toPlain(record);
    await this.writeCache(entityType, entityId, plain);
    return plain;
  }

  private async upsertSiteSeo(
    data: ISeoMetadata
  ): Promise<{ status: number; seoMetadata?: ISeoMetadata }> {
    const sanitizedKeywords = this.sanitizeKeywords(data.keywords);
    const payload: Partial<SeoMetadata> = {
      ...data,
      entityType: null,
      entityId: null,
    };

    if (sanitizedKeywords === undefined) {
      delete (payload as any).keywords;
    } else {
      (payload as any).keywords = sanitizedKeywords;
    }

    let record = await this.findSiteSeoEntity();

    let status: number;

    if (record) {
      this.repository.merge(record, payload);
      record = await this.repository.save(record);
      status = StatusCode.OK;
    } else {
      record = this.repository.create(payload);
      record = await this.repository.save(record);
      status = StatusCode.CREATED;
    }

    const plain = this.toPlain(record);
    await this.writeSiteCache(plain);

    return { status, seoMetadata: plain };
  }

  private async findSiteSeoEntity(): Promise<SeoMetadata | null> {
    return this.repository.findOne({
      where: {
        entityType: null,
        entityId: null,
        isDeleted: false,
      },
    });
  }

  private async loadSiteSeo(): Promise<ISeoMetadata | null> {
    const record = await this.baseNotDeletedQuery()
      .andWhere("seo.entityId IS NULL")
      .andWhere("seo.entityType IS NULL")
      .orderBy("seo.createdAt", "DESC")
      .getOne();

    if (!record) return null;
    return this.toPlain(record);
  }

  async getSiteSeo(): Promise<ISeoMetadata | null> {
    const cached = await this.readSiteCache();
    if (cached !== undefined) {
      return cached;
    }

    const plain = await this.loadSiteSeo();
    await this.writeSiteCache(plain);
    return plain;
  }

  async getAllSiteSeo(): Promise<ISeoMetadata[]> {
    const records = await this.baseNotDeletedQuery()
      .andWhere("seo.entityId IS NULL")
      .andWhere("seo.entityType IS NULL")
      .orderBy("seo.createdAt", "DESC")
      .getMany();

    return records.map((record) => this.toPlain(record));
  }

  async getSeoMetadataMap(
    entityType: SeoEntityType,
    entityIds: string[]
  ): Promise<Record<string, ISeoMetadata | null>> {
    const uniqueIds = Array.from(
      new Set(entityIds.filter((id): id is string => Boolean(id)))
    );

    const result: Record<string, ISeoMetadata | null> = {};
    const idsToFetch: string[] = [];

    for (const id of uniqueIds) {
      const cached = await this.readCache(entityType, id);
      if (cached === undefined) {
        idsToFetch.push(id);
      } else {
        result[id] = cached;
      }
    }

    if (idsToFetch.length) {
      const records = await this.repository.find({
        where: {
          entityType,
          entityId: In(idsToFetch),
          isDeleted: false,
        },
      });

      const foundIds = new Set<string>();
      for (const record of records) {
        const plain = this.toPlain(record);
        result[record.entityId] = plain;
        foundIds.add(record.entityId);
        await this.writeCache(entityType, record.entityId, plain);
      }

      const notFoundIds = idsToFetch.filter((id) => !foundIds.has(id));
      await Promise.all(
        notFoundIds.map((id) => this.markNotFoundCache(entityType, id))
      );
      for (const id of notFoundIds) {
        result[id] = null;
      }
    }

    return result;
  }
}
