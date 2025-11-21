import { In } from "typeorm";
import { isUUID } from "class-validator";
import { BaseService } from "../base.service";
import { Video as VideoEntity } from "../../entities/video.entity";
import { IVideo } from "../../dto/video/video.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Product } from "../../entities/product.entity";

export class Video extends BaseService<VideoEntity> {
  private productRepo = AppDataSource.getRepository(Product);

  constructor() {
    super(VideoEntity);
  }

  async createVideo(data: IVideo): Promise<{ status: number }> {
    if (
      !data.productId ||
      !data.title ||
      !data.youtubeVideoId ||
      !data.productModelNumber
    ) {
      return { status: StatusCode.BAD_REQUEST };
    }

    const product = await this.productRepo.findOne({
      where: { id: data.productId, isDeleted: false },
      select: ["id", "name"],
    });

    if (!product) return { status: StatusCode.NOT_FOUND };

    const sortOrder = await this.resolveSortOrder(data.sortOrder, {
      scope: { productId: product.id },
    });

    const video = this.repository.create({
      title: data.title,
      youtubeVideoId: data.youtubeVideoId,
      productModelNumber: data.productModelNumber,
      product,
      sortOrder,
    });

    await this.repository.save(video);
    return { status: StatusCode.CREATED };
  }

  async getAllVideos(
    page = 1,
    limit = 10,
    search = "",
    productId?: string
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("video")
      .leftJoinAndSelect(
        "video.product",
        "product",
        "product.isDeleted = false"
      )
      .where("video.isDeleted = false");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (search) {
      query.andWhere(
        "(video.title ILIKE :search OR video.productModelNumber ILIKE :search OR video.youtubeVideoId ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    query
      .orderBy("video.sortOrder", "ASC")
      .addOrderBy("video.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [videos, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        videos,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVideoById(
    identifier: string
  ): Promise<{ status: number; video?: VideoEntity }> {
    const query = this.repository
      .createQueryBuilder("video")
      .leftJoinAndSelect(
        "video.product",
        "product",
        "product.isDeleted = false"
      )
      .where("video.isDeleted = false");

    if (isUUID(identifier)) {
      query.andWhere("video.id = :identifier", { identifier });
    } else {
      query.andWhere("video.youtubeVideoId = :identifier", { identifier });
    }

    const video = await query.getOne();

    if (!video) return { status: StatusCode.NOT_FOUND };

    return { status: StatusCode.OK, video };
  }

  async getVideosByProductId(
    productId: string
  ): Promise<{ status: number; videos?: VideoEntity[] }> {
    const product = await this.productRepo.findOne({
      where: { id: productId, isDeleted: false },
      select: ["id"],
    });

    if (!product) return { status: StatusCode.NOT_FOUND };

    const videos = await this.repository
      .createQueryBuilder("video")
      .leftJoin("video.product", "product", "product.isDeleted = false")
      .where("video.isDeleted = false")
      .andWhere("product.id = :productId", { productId })
      .orderBy("video.sortOrder", "ASC")
      .addOrderBy("video.createdAt", "DESC")
      .getMany();

    return { status: StatusCode.OK, videos };
  }

  async updateVideo(id: string, data: IVideo): Promise<{ status: number }> {
    const video = await this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ["product"],
    });

    if (!video) return { status: StatusCode.NOT_FOUND };

    let product = video.product;
    if (data.productId && (!product || product.id !== data.productId)) {
      product = await this.productRepo.findOne({
        where: { id: data.productId, isDeleted: false },
        select: ["id", "name"],
      });
      if (!product) return { status: StatusCode.NOT_FOUND };
    }

    const sortScope: Record<string, string> | undefined = product?.id
      ? { productId: product.id }
      : undefined;

    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      video.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: video.id,
        scope: sortScope,
      });
    }

    this.repository.merge(video, {
      title: data.title ?? video.title,
      youtubeVideoId: data.youtubeVideoId ?? video.youtubeVideoId,
      productModelNumber: data.productModelNumber ?? video.productModelNumber,
      product,
    });

    await this.repository.save(video);
    return { status: StatusCode.OK };
  }

  async deleteVideo(
    ids: string[] | string
  ): Promise<{ status: number; deletedVideoIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const videos = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!videos.length)
      return { status: StatusCode.NOT_FOUND, deletedVideoIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedVideoIds: ids };
  }

  async hardDeleteVideos(
    ids: string[] | string
  ): Promise<{ status: number; deletedVideoIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const videos = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });

    if (!videos.length)
      return { status: StatusCode.NOT_FOUND, deletedVideoIds: [] };

    const videoIds = videos.map((video) => video.id);
    await this.repository.delete({ id: In(videoIds) });

    return { status: StatusCode.OK, deletedVideoIds: videoIds };
  }

  async recoverDeletedVideos(
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

  async getDeletedVideos(
    page = 1,
    limit = 10,
    search = "",
    productId?: string
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.product", "product")
      .where("video.isDeleted = true");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (search) {
      query.andWhere(
        "(video.title ILIKE :search OR video.productModelNumber ILIKE :search OR video.youtubeVideoId ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    query.orderBy("video.updatedAt", "DESC").skip(skip).take(limit);

    const [videos, total] = await query.getManyAndCount();
    return {
      status: StatusCode.OK,
      data: {
        videos,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
