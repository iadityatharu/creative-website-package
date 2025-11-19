import { BaseService } from "../base.service";
import { Gallery as GalleryEntity } from "../../entities/gallery.entity";
import { MediaAsset } from "../../entities/mediaAssets.entity";
import { Product } from "../../entities/product.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import { IGallery } from "../../dto/gallery/gallery.interface";
import { In } from "typeorm";
import { isUUID } from "class-validator";
import { AppDataSource } from "../../configs/psqlDb.config";
import { MediaType } from "../../constant/enum.constant";
import { deleteMedia } from "../../functions/deleteMedia";

export class Gallery extends BaseService<GalleryEntity> {
  private productRepo = AppDataSource.getRepository(Product);
  private mediaRepo = AppDataSource.getRepository(MediaAsset);

  constructor() {
    super(GalleryEntity);
  }

  private normalizeMediaType(
    type?: MediaType | string | null
  ): MediaType | undefined {
    if (!type) return undefined;
    const candidate = `${type}`.toUpperCase();
    return (Object.values(MediaType) as string[]).includes(candidate)
      ? (candidate as MediaType)
      : undefined;
  }

  private inferMediaTypeFromUrl(fileUrl: string): MediaType {
    const path = fileUrl.split("?")[0]?.toLowerCase() || "";
    const videoExt = [
      ".mp4",
      ".webm",
      ".mov",
      ".avi",
      ".mkv",
      ".m4v",
      ".wmv",
      ".flv",
    ];
    const documentExt = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
    ];

    if (videoExt.some((ext) => path.endsWith(ext))) return MediaType.VIDEO;
    if (documentExt.some((ext) => path.endsWith(ext)))
      return MediaType.DOCUMENT;
    return MediaType.IMAGE;
  }

  private resolveMediaType(
    fileUrl: string,
    type?: MediaType | string | null
  ): MediaType {
    return this.normalizeMediaType(type) ?? this.inferMediaTypeFromUrl(fileUrl);
  }

  async createGallery(data: IGallery): Promise<{ status: number }> {
    const product = await this.productRepo.findOne({
      where: { id: data.productId },
      select: ["id", "name"],
    });
    if (!product) return { status: StatusCode.NOT_FOUND };

    const gallery = this.repository.create({
      caption: data.caption,
      isHome: data.isHome ?? false,
      product,
    });

    const savedGallery = await this.repository.save(gallery);

    if (data.mediaUrls?.length) {
      const mediaAssets = data.mediaUrls.map((fileUrl, index) =>
        this.mediaRepo.create({
          gallery: savedGallery,
          fileUrl,
          type: this.resolveMediaType(
            fileUrl,
            data.mediaTypes?.[index] ?? null
          ),
        })
      );
      await this.mediaRepo.save(mediaAssets);
    }

    return { status: StatusCode.CREATED };
  }

  async getAllGalleries(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const [galleries, total] = await this.repository
      .createQueryBuilder("gallery")
      .leftJoinAndSelect(
        "gallery.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "gallery.mediaAsset",
        "mediaAsset",
        "mediaAsset.isDeleted = false"
      )
      .addSelect([
        "product.id",
        "product.name",
        "mediaAsset.fileUrl",
        "mediaAsset.type",
      ])
      .where("gallery.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere(search ? "gallery.caption ILIKE :search" : "TRUE", {
        search: `%${search}%`,
      })
      .orderBy("gallery.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        galleries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGalleryById(
    identifier: string
  ): Promise<{ status: number; gallery?: GalleryEntity }> {
    let gallery: GalleryEntity | null = null;

    if (isUUID(identifier)) {
      gallery = await this.repository
        .createQueryBuilder("gallery")
        .leftJoinAndSelect(
          "gallery.product",
          "product",
          "product.isDeleted = false"
        )
        .leftJoinAndSelect(
          "gallery.mediaAsset",
          "mediaAsset",
          "mediaAsset.isDeleted = false"
        )
        .where("gallery.id = :identifier", { identifier })
        .andWhere("gallery.isDeleted = :isDeleted", { isDeleted: false })
        .getOne();
    }

    if (!gallery) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, gallery };
  }

  async updateGallery(id: string, data: IGallery): Promise<{ status: number }> {
    const gallery = await this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ["mediaAsset"],
    });

    if (!gallery) return { status: StatusCode.NOT_FOUND };

    const product = data.productId
      ? await this.productRepo.findOne({
          where: { id: data.productId },
          select: ["id", "name"],
        })
      : undefined;

    this.repository.merge(gallery, {
      caption: data.caption ?? gallery.caption,
      isHome: data.isHome ?? gallery.isHome,
      product,
    });

    const updatedGallery = await this.repository.save(gallery);

    if (
      Array.isArray((data as any).removeUrls) &&
      (data as any).removeUrls.length > 0
    ) {
      await deleteMedia({ urls: (data as any).removeUrls });
      await this.mediaRepo
        .createQueryBuilder()
        .delete()
        .from(MediaAsset)
        .where("fileUrl IN (:...urls)", { urls: (data as any).removeUrls })
        .execute();
    }

    if (data.mediaUrls?.length) {
      const newMediaAssets = data.mediaUrls.map((fileUrl, index) =>
        this.mediaRepo.create({
          gallery: updatedGallery,
          fileUrl,
          type: this.resolveMediaType(
            fileUrl,
            data.mediaTypes?.[index] ?? null
          ),
        })
      );
      await this.mediaRepo.save(newMediaAssets);
    }

    return { status: StatusCode.OK };
  }
  async deleteGallery(
    ids: string[] | string
  ): Promise<{ status: number; deletedGalleryIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const galleries = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!galleries.length)
      return { status: StatusCode.NOT_FOUND, deletedGalleryIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedGalleryIds: ids };
  }

  async hardDeleteGalleries(
    ids: string[] | string
  ): Promise<{ status: number; deletedGalleryIds: string[]; deletedAssets: number }> {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length)
      return {
        status: StatusCode.BAD_REQUEST,
        deletedGalleryIds: [],
        deletedAssets: 0,
      };

    const galleries = await this.repository.find({
      where: { id: In(ids) },
      relations: ["mediaAsset"],
    });

    if (!galleries.length)
      return {
        status: StatusCode.NOT_FOUND,
        deletedGalleryIds: [],
        deletedAssets: 0,
      };

    const galleryIds = galleries.map((gallery) => gallery.id);

    const assetUrls = galleries
      .flatMap((gallery) =>
        (gallery.mediaAsset ?? [])
          .map((asset) => asset.fileUrl)
          .filter((url): url is string => Boolean(url))
      )
      .filter(Boolean);

    if (assetUrls.length) {
      deleteMedia({ urls: assetUrls }).catch(console.error);
    }

    await this.mediaRepo
      .createQueryBuilder()
      .delete()
      .from(MediaAsset)
      .where('"galleryId" IN (:...ids)', { ids: galleryIds })
      .execute();

    await this.repository.delete({ id: In(galleryIds) });

    return {
      status: StatusCode.OK,
      deletedGalleryIds: galleryIds,
      deletedAssets: assetUrls.length,
    };
  }

  async recoverDeletedGalleries(
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

  async getDeletedGalleries(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const [galleries, total] = await this.repository
      .createQueryBuilder("gallery")
      .leftJoinAndSelect("gallery.product", "product")
      .leftJoinAndSelect("gallery.mediaAsset", "mediaAsset")
      .addSelect([
        "product.id",
        "product.name",
        "mediaAsset.fileUrl",
        "mediaAsset.type",
      ])
      .where("gallery.isDeleted = :isDeleted", { isDeleted: true })
      .andWhere(search ? "gallery.caption ILIKE :search" : "TRUE", {
        search: `%${search}%`,
      })
      .orderBy("gallery.updatedAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        galleries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
