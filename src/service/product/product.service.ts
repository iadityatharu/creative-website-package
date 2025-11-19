import { BaseService } from "../base.service";
import { Product as ProductEntity } from "../../entities/product.entity";
import { IProduct } from "../../dto/product/product.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In, Brackets, SelectQueryBuilder } from "typeorm";
import { isUUID } from "class-validator";
import { AppDataSource } from "../../configs/psqlDb.config";
import { SubCategory } from "../../entities/subcategory.entity";
import { Inquiry } from "../../entities/inquiry.entity";
import { EmailQueue } from "../../email/email.queue";
import { newProductMailTemplate } from "../../mailtemplate/productlistedmail";
import { SeoMetadataService } from "../seo-metadata/seo-metadata.service";
import { SeoEntityType, ProductType } from "../../constant/enum.constant";
import { deleteMedia } from "../../functions/deleteMedia";
import { stripDeletedRelations } from "./product.helpers";

export class Product extends BaseService<ProductEntity> {
  private subCategoryRepo = AppDataSource.getRepository(SubCategory);
  private inquiryRepo = AppDataSource.getRepository(Inquiry);
  private seoMetadataService = new SeoMetadataService();

  constructor() {
    super(ProductEntity);
  }
  async createProduct(data: IProduct): Promise<{ status: number }> {
    const existing = await this.repository.findOne({
      where: [{ name: data.name }, { slug: data.slug }],
    });
    if (existing) return { status: StatusCode.ALREADY_EXIST };

    const {
      subcategoryId,
      gallery: _gallery,
      imageUrl: _imageUrl,
      ...payload
    } = data;

    const { coverImage, removeUrls, ...rest } = payload;

    let subcategory = null;
    if (subcategoryId) {
      subcategory = await this.subCategoryRepo.findOne({
        where: { id: subcategoryId },
      });
      if (!subcategory) return { status: StatusCode.NOT_FOUND };
    }

    const product = this.repository.create({
      ...rest,
      ...(coverImage !== undefined ? { coverImage } : {}),
      subcategory: subcategory ?? undefined,
    });

    await this.repository.save(product);
    const inquiries = await this.inquiryRepo
      .createQueryBuilder("inquiry")
      .select("DISTINCT inquiry.email", "email")
      .where("inquiry.email IS NOT NULL")
      .getRawMany();

    const clientEmails = inquiries.map((i) => i.email).filter(Boolean);

    if (clientEmails.length > 0) {
      const html = newProductMailTemplate({
        ...rest,
      });

      await EmailQueue.addBulkEmails(clientEmails, "New Product Listed!", html);
    }

    return { status: StatusCode.CREATED };
  }


  async getProductsBySubCategory(
    subcategoryId: string,
    page = 1,
    limit = 10
  ): Promise<{ status: number; data?: object }> {
    const subcategory = await this.subCategoryRepo.findOne({
      where: { id: subcategoryId, isDeleted: false },
      select: ["id"],
    });

    if (!subcategory) {
      return { status: StatusCode.NOT_FOUND };
    }

    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("product")
      .leftJoinAndSelect(
        "product.subcategory",
        "subcategory",
        "subcategory.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.gallery",
        "gallery",
        "gallery.isDeleted = false"
      )
      .leftJoinAndSelect(
        "gallery.mediaAsset",
        "galleryMedia",
        "galleryMedia.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.videos",
        "video",
        "video.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.downloadCategories",
        "downloadCategory",
        "downloadCategory.isDeleted = false"
      )
      .leftJoinAndSelect(
        "downloadCategory.items",
        "downloadCategoryItem",
        "downloadCategoryItem.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.downloads",
        "download",
        "download.isDeleted = false"
      )
      .where("product.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("subcategory.id = :subcategoryId", { subcategoryId })
      .orderBy("product.name", "ASC")
      .skip(skip)
      .take(limit);

    const [products, total] = await query.getManyAndCount();

    const sanitizedProducts = products.map((product) =>
      stripDeletedRelations(product)
    );

    const seoMetadataMap = await this.seoMetadataService.getSeoMetadataMap(
      SeoEntityType.PRODUCT,
      sanitizedProducts.map((product) => product.id)
    );

    const result = sanitizedProducts.map((p) => ({
      ...p,
      subcategory: p.subcategory
        ? {
            id: p.subcategory.id,
            title: p.subcategory.title,
            slug: p.subcategory.slug,
          }
        : null,
      seoMetadata: seoMetadataMap[p.id] ?? null,
    }));

    return {
      status: StatusCode.OK,
      data: {
        products: result,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(identifier: string): Promise<{
    status: number;
    product?: any;
    similarProducts?: any[];
  }> {
    const query = this.repository
      .createQueryBuilder("product")
      .leftJoinAndSelect(
        "product.subcategory",
        "subcategory",
        "subcategory.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.gallery",
        "gallery",
        "gallery.isDeleted = false"
      )
      .leftJoinAndSelect(
        "gallery.mediaAsset",
        "galleryMedia",
        "galleryMedia.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.videos",
        "video",
        "video.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.downloadCategories",
        "downloadCategory",
        "downloadCategory.isDeleted = false"
      )
      .leftJoinAndSelect(
        "downloadCategory.items",
        "downloadCategoryItem",
        "downloadCategoryItem.isDeleted = false"
      )
      .leftJoinAndSelect(
        "product.downloads",
        "download",
        "download.isDeleted = false"
      )
      .where("product.isDeleted = false");

    if (isUUID(identifier)) {
      query.andWhere("product.id = :identifier", { identifier });
    } else {
      query.andWhere("product.slug = :identifier", { identifier });
    }

    const product = await query.getOne();

    if (!product) return { status: StatusCode.NOT_FOUND };

    stripDeletedRelations(product);

    const seoMetadata = await this.seoMetadataService.getSeoMetadataForEntity(
      SeoEntityType.PRODUCT,
      product.id
    );

    const similarProducts = await this.getSimilarProducts(product, 8);

    const productPlain = JSON.parse(JSON.stringify(product));
    productPlain.seoMetadata = seoMetadata;
    productPlain.subcategory = product.subcategory
      ? {
          id: product.subcategory.id,
          title: product.subcategory.title,
          slug: product.subcategory.slug,
        }
      : null;

    const similarPlain = similarProducts.map((item) => {
      const plain = JSON.parse(JSON.stringify(item));
      plain.subcategory = item.subcategory
        ? {
            id: item.subcategory.id,
            title: item.subcategory.title,
            slug: item.subcategory.slug,
          }
        : null;
      return plain;
    });

    return {
      status: StatusCode.OK,
      product: productPlain,
      similarProducts: similarPlain,
    };
  }

  private async getSimilarProducts(
    baseProduct: ProductEntity,
    limit = 8
  ): Promise<ProductEntity[]> {
    const similar: ProductEntity[] = [];
    const seenIds = new Set<string>([baseProduct.id]);

    const fetch = async (
      configure?: (qb: SelectQueryBuilder<ProductEntity>) => void
    ) => {
      const remaining = limit - similar.length;
      if (remaining <= 0) return;

      const qb = this.repository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.subcategory", "subcategory")
        .where("product.isDeleted = false")
        .andWhere("product.id != :id", { id: baseProduct.id })
        .orderBy("product.sortOrder", "ASC")
        .addOrderBy("product.createdAt", "DESC")
        .take(remaining);

      if (seenIds.size > 1) {
        qb.andWhere("product.id NOT IN (:...excludeIds)", {
          excludeIds: Array.from(seenIds),
        });
      }

      configure?.(qb);

      const results = await qb.getMany();
      for (const candidate of results) {
        const sanitized = stripDeletedRelations(candidate);
        if (seenIds.has(sanitized.id)) continue;
        seenIds.add(sanitized.id);
        similar.push(sanitized);
        if (similar.length >= limit) break;
      }
    };

    if (baseProduct.subcategory?.id) {
      await fetch((qb) =>
        qb.andWhere("subcategory.id = :subcategoryId", {
          subcategoryId: baseProduct.subcategory!.id,
        })
      );
    }

    if (similar.length < limit) {
      await fetch();
    }

    return similar;
  }

  async updateProduct(id: string, data: IProduct): Promise<{ status: number }> {
    const product = await this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ["subcategory"],
    });
    if (!product) return { status: StatusCode.NOT_FOUND };

    const {
      subcategoryId,
      gallery: _gallery,
      imageUrl: _imageUrl,
      ...payload
    } = data;

    const { coverImage, removeUrls, ...rest } = payload;

    let subcategory = product.subcategory;
    if (subcategoryId !== undefined) {
      if (subcategoryId) {
        subcategory = await this.subCategoryRepo.findOne({
          where: { id: subcategoryId },
        });
        if (!subcategory) return { status: StatusCode.NOT_FOUND };
      } else {
        subcategory = null;
      }
    }

    const updatePayload: Partial<ProductEntity> = { ...rest };
    if (coverImage !== undefined) {
      updatePayload.coverImage = coverImage;
    }

    const sanitizedRemoveUrls = Array.isArray(removeUrls)
      ? removeUrls.filter((url): url is string => typeof url === "string")
      : undefined;

    if (sanitizedRemoveUrls && sanitizedRemoveUrls.length > 0) {
      const detailSource = Array.isArray(rest.detailImage)
        ? rest.detailImage
        : Array.isArray(product.detailImage)
        ? product.detailImage
        : undefined;

      if (detailSource) {
        updatePayload.detailImage = detailSource.filter(
          (url) => !sanitizedRemoveUrls.includes(url)
        );
      }
    }
    this.repository.merge(product, updatePayload);

    if (subcategoryId !== undefined) {
      (product as any).subcategory = subcategory ?? null;
    }

    await this.repository.save(product);

    if (sanitizedRemoveUrls && sanitizedRemoveUrls.length) {
      deleteMedia({ urls: sanitizedRemoveUrls }).catch(console.error);
    }

    return { status: StatusCode.OK };
  }

  async getProductsForExport(
    search = "",
    page?: number,
    limit?: number,
    fields?: string[]
  ) {
    const query = this.repository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.subcategory", "subcategory")
      .leftJoinAndSelect("subcategory.category", "category")
      .where("product.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere(
        "(subcategory.id IS NULL OR subcategory.isDeleted = false)"
      )
      .andWhere("(category.id IS NULL OR category.isDeleted = false)");

    if (search) {
      const searchParam = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where("COALESCE(product.name, '') ILIKE :search", {
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
            .orWhere("COALESCE(product.shortDescription, '') ILIKE :search", {
              search: searchParam,
            })
            .orWhere("COALESCE(product.description, '') ILIKE :search", {
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

    const orderByQuery = query.orderBy("product.createdAt", "DESC");

    if (
      page !== undefined &&
      limit !== undefined &&
      Number(page) > 0 &&
      Number(limit) > 0
    ) {
      const skip = (Number(page) - 1) * Number(limit);
      orderByQuery.skip(skip).take(Number(limit));
    }

    const products = await orderByQuery
      .getMany()
      .then((items) => items.map((item) => stripDeletedRelations(item)));

    const defaultFields = [
      "name",
      "sku",
      "slug",
      "model",
      "productType",
      "subcategory",
      "price",
      "yearlyPrice",
      "mrp",
      "isPublished",
      "isPopular",
      "createdAt",
    ];

    const selectedFields =
      Array.isArray(fields) && fields.length
        ? fields.map((field) => field.trim()).filter(Boolean)
        : defaultFields;

    return products.map((product) => {
      const base = {
        name: product.name,
        sku: product.sku ?? "",
        slug: product.slug,
        model: product.model ?? "",
        productType: product.productType,
        subcategory: product.subcategory?.title ?? "-",
        price: product.price ?? null,
        yearlyPrice: product.yearlyPrice ?? null,
        mrp: product.mrp ?? null,
        isPublished: product.isPublished,
        isPopular: product.isPopular,
        createdAt: product.createdAt,
      };

      const filtered: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        if (field in base) {
          filtered[field] = (base as any)[field];
        }
      });

      return filtered;
    });
  }

  async deleteProduct(
    ids: string[] | string
  ): Promise<{ status: number; deletedProductIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const products = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });
    if (!products.length)
      return { status: StatusCode.NOT_FOUND, deletedProductIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedProductIds: ids };
  }

  async hardDeleteProducts(
    ids: string[] | string
  ): Promise<{ status: number; deletedProductIds: string[]; deletedAssets: number }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length) {
      return {
        status: StatusCode.BAD_REQUEST,
        deletedProductIds: [],
        deletedAssets: 0,
      };
    }

    const products = await this.repository.find({
      where: { id: In(idList), isDeleted: true },
      relations: ["gallery", "gallery.mediaAsset"],
    });

    if (!products.length) {
      return {
        status: StatusCode.NOT_FOUND,
        deletedProductIds: [],
        deletedAssets: 0,
      };
    }

    const deletedProductIds = products.map((product) => product.id);
    const assetUrls: string[] = [];

    for (const product of products) {
      if (product.coverImage) assetUrls.push(product.coverImage);
      if (Array.isArray(product.detailImage)) {
        assetUrls.push(...product.detailImage.filter(Boolean));
      }
      if (product.manualUrl) assetUrls.push(product.manualUrl);
      if (product.brochureUrl) assetUrls.push(product.brochureUrl);
      product.gallery?.forEach((gallery) => {
        gallery.mediaAsset?.forEach((asset) => {
          if (asset.fileUrl) assetUrls.push(asset.fileUrl);
        });
      });
    }

    await this.repository.delete({ id: In(deletedProductIds) });

    if (assetUrls.length) {
      deleteMedia({ urls: assetUrls }).catch(console.error);
    }

    return {
      status: StatusCode.OK,
      deletedProductIds,
      deletedAssets: assetUrls.length,
    };
  }
}
