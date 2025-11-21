import { In } from "typeorm";
import { BaseService } from "../base.service";
import { ProductDownload } from "../../entities/product-download";
import { IProductDownload } from "../../dto/product-download/product-download.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Product } from "../../entities/product.entity";
import { ProductDownloadCategory } from "../../entities/download-category";
import { Platform } from "../../constant/enum.constant";
import { deleteFromR2 } from "../../utils/r2DeleteUtil";

export class ProductDownloadService extends BaseService<ProductDownload> {
  private productRepo = AppDataSource.getRepository(Product);
  private categoryRepo = AppDataSource.getRepository(ProductDownloadCategory);

  constructor() {
    super(ProductDownload);
  }

  private normalizeSizeBytes(value?: number | string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "number") return value.toString();
    return value;
  }

  async createDownload(data: IProductDownload): Promise<{ status: number }> {
    if (
      !data.productId ||
      !data.categoryId ||
      !data.title ||
      !data.downloadUrl ||
      !data.platforms ||
      data.platforms.length === 0
    ) {
      return { status: StatusCode.BAD_REQUEST };
    }
    const product = await this.productRepo.findOne({
      where: { id: data.productId, isDeleted: false },
      select: ["id"],
    });
    if (!product) return { status: StatusCode.NOT_FOUND };
    const category = await this.categoryRepo.findOne({
      where: { id: data.categoryId, isDeleted: false },
      relations: ["product"],
    });
    if (!category) return { status: StatusCode.NOT_FOUND };
    if (category.product && category.product.id !== product.id) {
      return { status: StatusCode.BAD_REQUEST };
    }
    const { productId, categoryId, sizeBytes, ...rest } = data;
    const download = this.repository.create({
      ...rest,
      sizeBytes: this.normalizeSizeBytes(sizeBytes),
      product,
      category,
    });

    await this.repository.save(download);
    return { status: StatusCode.CREATED };
  }

  async getAllDownloads(
    page = 1,
    limit = 10,
    productId?: string,
    categoryId?: string,
    search = "",
    platform?: Platform,
    isActive?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("download")
      .leftJoinAndSelect(
        "download.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "download.category",
        "category",
        "category.isDeleted = false"
      )
      .where("download.isDeleted = false")
      .andWhere("product.id IS NOT NULL")
      .andWhere("category.id IS NOT NULL");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (categoryId) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    if (search) {
      query.andWhere("download.title ILIKE :search", { search: `%${search}%` });
    }

    if (platform) {
      query.andWhere(":platform = ANY(download.platforms)", { platform });
    }

    if (isActive !== undefined) {
      query.andWhere("download.isActive = :isActive", { isActive });
    }

    query
      .orderBy("download.sortOrder", "ASC")
      .addOrderBy("download.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [downloads, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        downloads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDownloadById(
    id: string
  ): Promise<{ status: number; download?: ProductDownload }> {
    const download = await this.repository
      .createQueryBuilder("download")
      .leftJoinAndSelect(
        "download.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "download.category",
        "category",
        "category.isDeleted = false"
      )
      .leftJoinAndSelect(
        "category.product",
        "categoryProduct",
        "categoryProduct.isDeleted = false"
      )
      .where("download.id = :id", { id })
      .andWhere("download.isDeleted = false")
      .andWhere("product.id IS NOT NULL")
      .andWhere("category.id IS NOT NULL")
      .getOne();

    if (!download) return { status: StatusCode.NOT_FOUND };

    return { status: StatusCode.OK, download };
  }

  async getDownloadsByProductId(
    productId: string
  ): Promise<{ status: number; downloads?: ProductDownload[] }> {
    const product = await this.productRepo.findOne({
      where: { id: productId, isDeleted: false },
      select: ["id"],
    });

    if (!product) return { status: StatusCode.NOT_FOUND };

    const downloads = await this.repository
      .createQueryBuilder("download")
      .leftJoin("download.product", "product", "product.isDeleted = false")
      .leftJoinAndSelect(
        "download.category",
        "category",
        "category.isDeleted = false"
      )
      .where("download.isDeleted = false")
      .andWhere("product.id = :productId", { productId })
      .orderBy("download.sortOrder", "ASC")
      .addOrderBy("download.createdAt", "DESC")
      .getMany();

    return { status: StatusCode.OK, downloads };
  }

  async updateDownload(
    id: string,
    data: IProductDownload
  ): Promise<{ status: number }> {
    const download = await this.repository
      .createQueryBuilder("download")
      .leftJoinAndSelect(
        "download.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "download.category",
        "category",
        "category.isDeleted = false"
      )
      .leftJoinAndSelect(
        "category.product",
        "categoryProduct",
        "categoryProduct.isDeleted = false"
      )
      .where("download.id = :id", { id })
      .andWhere("download.isDeleted = false")
      .andWhere("product.id IS NOT NULL")
      .andWhere("category.id IS NOT NULL")
      .getOne();

    if (!download) return { status: StatusCode.NOT_FOUND };
    const previousUrl = download.downloadUrl;

    let product = download.product;
    if (data.productId) {
      product = await this.productRepo.findOne({
        where: { id: data.productId, isDeleted: false },
        select: ["id"],
      });
      if (!product) return { status: StatusCode.NOT_FOUND };
    }

    let category = download.category;
    if (data.categoryId) {
      category = await this.categoryRepo.findOne({
        where: { id: data.categoryId, isDeleted: false },
        relations: ["product"],
      });
      if (!category) return { status: StatusCode.NOT_FOUND };
    }

    if (
      category &&
      product &&
      category.product &&
      category.product.id !== product.id
    ) {
      return { status: StatusCode.BAD_REQUEST };
    }

    const { productId, categoryId, sizeBytes, ...rest } = data;
    this.repository.merge(download, rest);

    if (sizeBytes !== undefined) {
      download.sizeBytes = this.normalizeSizeBytes(sizeBytes);
    }
    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      download.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: download.id,
      });
    }
    if (product) {
      (download as any).product = product;
    }

    if (category) {
      (download as any).category = category;
    }

    await this.repository.save(download);

    if (
      previousUrl &&
      download.downloadUrl &&
      previousUrl !== download.downloadUrl
    ) {
      deleteFromR2(previousUrl).catch((err) =>
        console.error("Failed to delete previous download from R2:", err)
      );
    }

    return { status: StatusCode.OK };
  }

  async deleteDownload(
    ids: string[] | string
  ): Promise<{ status: number; deletedDownloadIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const downloads = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!downloads.length)
      return { status: StatusCode.NOT_FOUND, deletedDownloadIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedDownloadIds: ids };
  }

  async hardDeleteDownloads(ids: string[] | string): Promise<{
    status: number;
    deletedDownloadIds: string[];
    deletedAssets: number;
  }> {
    if (!Array.isArray(ids)) ids = [ids];

    const downloads = await this.repository.find({
      where: { id: In(ids) },
      select: ["id", "downloadUrl"],
    });

    if (!downloads.length)
      return {
        status: StatusCode.NOT_FOUND,
        deletedDownloadIds: [],
        deletedAssets: 0,
      };

    const downloadIds = downloads.map((download) => download.id);
    const urls = downloads
      .map((download) => download.downloadUrl)
      .filter((url): url is string => Boolean(url));

    await this.repository.delete({ id: In(downloadIds) });

    if (urls.length) {
      urls.forEach((url) => deleteFromR2(url).catch(console.error));
    }

    return {
      status: StatusCode.OK,
      deletedDownloadIds: downloadIds,
      deletedAssets: urls.length,
    };
  }

  async recoverDeletedDownloads(
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

  async getDeletedDownloads(
    page = 1,
    limit = 10,
    productId?: string,
    categoryId?: string,
    search = "",
    platform?: Platform,
    isActive?: boolean
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("download")
      .leftJoinAndSelect("download.product", "product")
      .leftJoinAndSelect("download.category", "category")
      .where("download.isDeleted = true");

    if (productId) {
      query.andWhere("product.id = :productId", { productId });
    }

    if (categoryId) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    if (search) {
      query.andWhere("download.title ILIKE :search", { search: `%${search}%` });
    }

    if (platform) {
      query.andWhere(":platform = ANY(download.platforms)", { platform });
    }

    if (isActive !== undefined) {
      query.andWhere("download.isActive = :isActive", { isActive });
    }

    query
      .orderBy("download.sortOrder", "ASC")
      .addOrderBy("download.updatedAt", "DESC")
      .skip(skip)
      .take(limit);

    const [downloads, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        downloads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
