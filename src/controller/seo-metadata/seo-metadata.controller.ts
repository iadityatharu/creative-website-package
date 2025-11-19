import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { ISeoMetadata } from "../../dto/seo-metadata/seo-metadata.interface";
import { SeoMetadataService } from "../../service/seo-metadata/seo-metadata.service";
import { SeoEntityType } from "../../constant/enum.constant";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { RecoverDto } from "../../dto/recover.dto";

export class SeoMetadataController {
  private seoMetadataService = new SeoMetadataService();

  private applyUploadedFiles(
    payload: ISeoMetadata,
    fileMap?: FileUploadMap
  ): void {
    if (!fileMap) return;

    const ogUploads = this.collectFileUrls(fileMap, [
      "openGraphImages",
      "ogImages",
      "ogImage",
    ]);

    if (ogUploads.length) {
      const base =
        payload.openGraph && typeof payload.openGraph === "object"
          ? { ...payload.openGraph }
          : {};

      const existing = Array.isArray((base as any).images)
        ? ((base as any).images as any[])
        : [];

      const normalizedExisting = existing
        .map((img) => {
          if (!img) return null;
          if (typeof img === "string") return { url: img };
          if (typeof img === "object" && img.url) return img;
          return null;
        })
        .filter((img): img is { url: string } => Boolean(img?.url));

      const uploaded = ogUploads.map((url) => ({ url }));

      payload.openGraph = {
        ...base,
        images: [...normalizedExisting, ...uploaded],
      };
    }

    const twitterUploads = this.collectFileUrls(fileMap, [
      "twitterImages",
      "twitterImage",
    ]);

    if (twitterUploads.length) {
      const base =
        payload.twitter && typeof payload.twitter === "object"
          ? { ...payload.twitter }
          : {};

      const existing = Array.isArray((base as any).images)
        ? ((base as any).images as any[])
        : [];

      const normalizedExisting = existing
        .map((img) => (typeof img === "string" ? img : img?.url || null))
        .filter((img): img is string => typeof img === "string" && !!img);

      payload.twitter = {
        ...base,
        images: [...normalizedExisting, ...twitterUploads],
      };
    }

    const sitemapUpload = this.collectFileUrls(fileMap, [
      "sitemapFile",
      "sitemapUrl",
    ])[0];
    if (sitemapUpload) {
      payload.sitemapUrl = sitemapUpload;
    }

    const manifestUpload = this.collectFileUrls(fileMap, [
      "manifestFile",
      "manifestUrl",
    ])[0];
    if (manifestUpload) {
      payload.manifestUrl = manifestUpload;
    }
  }

  private parseJSONField(
    value: unknown,
    fieldName: string
  ): any | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }

      try {
        return JSON.parse(trimmed);
      } catch (error) {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          `Invalid ${fieldName} payload`
        );
      }
    }

    if (typeof value === "object") {
      return value as Record<string, any>;
    }

    throw new expressError(
      StatusCode.BAD_REQUEST,
      `Invalid ${fieldName} payload`
    );
  }

  private normalizeBoolean(value: unknown): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (!value.trim()) return undefined;
      return value.toLowerCase() === "true";
    }
    return undefined;
  }

  private collectFileUrls(fileMap: FileUploadMap, fields: string[]): string[] {
    const urls: string[] = [];
    for (const field of fields) {
      const entries = fileMap[field];
      if (!entries) continue;

      entries.forEach((file) => {
        if (file?.fileUrl) {
          urls.push(file.fileUrl);
        }
      });
    }
    return urls;
  }

  private normalizeKeywords(value: unknown): string[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (Array.isArray(value)) {
      const cleaned = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      return cleaned.length ? cleaned : null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) =>
                typeof item === "string" ? item.trim() : String(item)
              )
              .filter((item) => item.length > 0);
          }
        } catch {
          // fall back to comma split
        }
      }

      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return null;
  }

  private normalizeTarget(payload: ISeoMetadata) {
    if (typeof payload.entityType === "string") {
      const trimmedType = payload.entityType.trim();
      payload.entityType = trimmedType
        ? (trimmedType as SeoEntityType)
        : undefined;
    }

    if (payload.entityId === "") {
      payload.entityId = undefined;
    } else if (typeof payload.entityId === "string") {
      const trimmed = payload.entityId.trim();
      payload.entityId = trimmed ? trimmed : undefined;
    }
  }

  private ensureValidTarget(payload: ISeoMetadata) {
    const hasEntityType =
      payload.entityType !== undefined && payload.entityType !== null;
    const hasEntityId =
      payload.entityId !== undefined && payload.entityId !== null;

    if (hasEntityType !== hasEntityId) {
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "entityType and entityId must be provided together"
      );
    }
  }

  private normalizeOpenGraph(payload: ISeoMetadata) {
    if (!payload.openGraph) return;

    if (Array.isArray(payload.openGraph)) {
      const images = payload.openGraph
        .map((item) =>
          typeof item === "string" ? item.trim() : item && (item as any).url
        )
        .filter((url): url is string => typeof url === "string" && !!url);

      payload.openGraph = images.length
        ? { images: images.map((url) => ({ url })) }
        : null;
      return;
    }

    if (typeof payload.openGraph !== "object") {
      payload.openGraph = null;
      return;
    }

    const clone: any = { ...payload.openGraph };
    if (clone.images !== undefined) {
      const rawImages = Array.isArray(clone.images)
        ? clone.images
        : [clone.images];

      clone.images = rawImages
        .map((img) => {
          if (!img) return null;
          if (typeof img === "string") {
            const trimmed = img.trim();
            return trimmed ? { url: trimmed } : null;
          }

          if (typeof img === "object" && img.url) {
            return {
              ...img,
              url: String(img.url).trim(),
            };
          }

          return null;
        })
        .filter((img: any) => img && img.url);

      if (!clone.images.length) {
        delete clone.images;
      }
    }

    payload.openGraph = Object.keys(clone).length ? clone : null;
  }

  private normalizeTwitter(payload: ISeoMetadata) {
    if (!payload.twitter) return;

    if (Array.isArray(payload.twitter)) {
      const images = payload.twitter
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((url) => url.length > 0);

      payload.twitter = images.length ? { images } : null;
      return;
    }

    if (typeof payload.twitter !== "object") {
      payload.twitter = null;
      return;
    }

    const clone: any = { ...payload.twitter };
    if (clone.images !== undefined) {
      const rawImages = Array.isArray(clone.images)
        ? clone.images
        : [clone.images];

      clone.images = rawImages
        .map((img) => {
          if (!img) return null;
          if (typeof img === "string") {
            const trimmed = img.trim();
            return trimmed || null;
          }
          if (typeof img === "object" && img.url) {
            return String(img.url).trim();
          }
          return null;
        })
        .filter((img: any) => typeof img === "string" && img.length > 0);

      if (!clone.images.length) {
        delete clone.images;
      }
    }

    payload.twitter = Object.keys(clone).length ? clone : null;
  }

  private normalizeBlocks(payload: ISeoMetadata) {
    this.normalizeOpenGraph(payload);
    this.normalizeTwitter(payload);
  }

  async createSeoMetadata(
    req: AuthenticatedRequest<{ body: ISeoMetadata }>,
    res: Response
  ) {
    const payload = { ...(req.body as ISeoMetadata) };

    this.normalizeTarget(payload);
    payload.openGraph = this.parseJSONField(payload.openGraph, "openGraph");
    payload.twitter = this.parseJSONField(payload.twitter, "twitter");
    payload.robots = this.parseJSONField(payload.robots, "robots");
    payload.alternates = this.parseJSONField(payload.alternates, "alternates");
    payload.jsonLd = this.parseJSONField(payload.jsonLd, "jsonLd");
    payload.extraMeta = this.parseJSONField(payload.extraMeta, "extraMeta");
    payload.keywords = this.normalizeKeywords(payload.keywords);
    payload.isIndexable = this.normalizeBoolean(payload.isIndexable);
    payload.isOptimized = this.normalizeBoolean(payload.isOptimized);
    this.normalizeBlocks(payload);
    this.applyUploadedFiles(payload, req.fileUrls);
    this.ensureValidTarget(payload);

    const result = await this.seoMetadataService.createSeoMetadata(payload);

    if (result.status === StatusCode.BAD_REQUEST) {
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);
    }

    if (result.status === StatusCode.ALREADY_EXIST) {
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "SEO metadata already exists for the provided entity"
      );
    }

    const responseStatus = result.status ?? StatusCode.CREATED;
    const responseMessage =
      responseStatus === StatusCode.CREATED ? Message.CREATED : Message.UPDATED;

    return res.status(responseStatus).json({
      status: responseStatus,
      message: responseMessage,
    });
  }

  async getAllSeoMetadata(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string) || "";
    const indexableParam = req.query.isIndexable as string | undefined;
    const optimizedParam = req.query.isOptimized as string | undefined;
    const entityTypeParam = req.query.entityType as string | undefined;

    let entityType: SeoEntityType | undefined = undefined;
    if (entityTypeParam) {
      const enumValues = Object.values(SeoEntityType) as string[];
      if (!enumValues.includes(entityTypeParam)) {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          "Invalid entityType value"
        );
      }
      entityType = entityTypeParam as SeoEntityType;
    }

    const isIndexable =
      indexableParam !== undefined ? indexableParam === "true" : undefined;
    const isOptimized =
      optimizedParam !== undefined ? optimizedParam === "true" : undefined;

    const result = await this.seoMetadataService.getAllSeoMetadata(
      page,
      limit,
      entityType,
      search,
      isIndexable,
      isOptimized
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getSeoMetadataById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.seoMetadataService.getSeoMetadataById(
      req.params.id
    );

    if (result.status === StatusCode.NOT_FOUND) {
      throw new expressError(StatusCode.NOT_FOUND, "SEO metadata not found");
    }

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      seoMetadata: result.seoMetadata,
    });
  }

  async getSiteSeoMetadata(req: AuthenticatedRequest, res: Response) {
    const result = await this.seoMetadataService.getSiteSeo();

    if (!result) {
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Site SEO metadata not found"
      );
    }

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      seoMetadata: result,
    });
  }

  async getAllSiteSeoMetadata(req: AuthenticatedRequest, res: Response) {
    const records = await this.seoMetadataService.getAllSiteSeo();

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      seoMetadata: records,
    });
  }

  async updateSeoMetadata(
    req: AuthenticatedRequest<{ id: string; body: ISeoMetadata }>,
    res: Response
  ) {
    const payload = { ...(req.body as ISeoMetadata) };

    this.normalizeTarget(payload);
    payload.openGraph = this.parseJSONField(payload.openGraph, "openGraph");
    payload.twitter = this.parseJSONField(payload.twitter, "twitter");
    payload.robots = this.parseJSONField(payload.robots, "robots");
    payload.alternates = this.parseJSONField(payload.alternates, "alternates");
    payload.jsonLd = this.parseJSONField(payload.jsonLd, "jsonLd");
    payload.extraMeta = this.parseJSONField(payload.extraMeta, "extraMeta");
    payload.keywords = this.normalizeKeywords(payload.keywords);
    payload.isIndexable = this.normalizeBoolean(payload.isIndexable);
    payload.isOptimized = this.normalizeBoolean(payload.isOptimized);
    this.normalizeBlocks(payload);
    this.applyUploadedFiles(payload, req.fileUrls);
    this.ensureValidTarget(payload);

    const result = await this.seoMetadataService.updateSeoMetadata(
      req.params.id,
      payload
    );

    if (result.status === StatusCode.NOT_FOUND) {
      throw new expressError(StatusCode.NOT_FOUND, "SEO metadata not found");
    }

    if (result.status === StatusCode.ALREADY_EXIST) {
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "SEO metadata already exists for the provided entity"
      );
    }

    const responseStatus = result.status ?? StatusCode.OK;

    return res.status(responseStatus).json({
      status: responseStatus,
      message: Message.UPDATED,
      seoMetadata: result.seoMetadata,
    });
  }

  async deleteSeoMetadata(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.seoMetadataService.deleteSeoMetadata(ids);

    if (result.status === StatusCode.BAD_REQUEST) {
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);
    }

    if (result.status === StatusCode.NOT_FOUND) {
      throw new expressError(StatusCode.NOT_FOUND, "SEO metadata not found");
    }

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.DELETED,
      deletedIds: result.deletedIds,
    });
  }

  async destroySeoMetadata(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.seoMetadataService.hardDeleteSeoMetadata(ids);

    if (result.status === StatusCode.BAD_REQUEST) {
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);
    }

    if (result.status === StatusCode.NOT_FOUND) {
      throw new expressError(StatusCode.NOT_FOUND, "SEO metadata not found");
    }

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "SEO metadata permanently deleted",
      deletedIds: result.deletedIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async getDeletedSeoMetadata(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const entityType = (req.query.entityType as SeoEntityType) || undefined;
    const search = (req.query.search as string) || "";
    const isIndexable =
      req.query.isIndexable !== undefined
        ? req.query.isIndexable === "true"
        : undefined;
    const isOptimized =
      req.query.isOptimized !== undefined
        ? req.query.isOptimized === "true"
        : undefined;

    const result = await this.seoMetadataService.getDeletedSeoMetadata(
      page,
      limit,
      entityType,
      search,
      isIndexable,
      isOptimized
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverSeoMetadata(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.seoMetadataService.recoverDeletedSeoMetadata(ids);

    if (result.status === StatusCode.BAD_REQUEST) {
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);
    }

    if (result.status === StatusCode.NOT_FOUND) {
      throw new expressError(StatusCode.NOT_FOUND, "SEO metadata not found");
    }

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "SEO metadata recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}

export default SeoMetadataController;
