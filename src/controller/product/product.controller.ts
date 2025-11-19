import { Response } from "express";
import { Product as ProductService } from "../../service/product/product.service";
import { ProductAdmin } from "../../service/product/product.admin.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IProduct, IProductRecover } from "../../dto/product/product.interface";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { MediaMap } from "../../functions/mediaMap";
import { FileUploadMap } from "../../types/fileUploadtypes";
import {
  formatDateTime,
  writeExcelResponse,
  writePdfResponse,
} from "../../utils/exportHelper";

export class Product {
  private productService = new ProductService();
  private productAdminService = new ProductAdmin();
  private mediaMap = new MediaMap();

  async createProduct(
    req: AuthenticatedRequest<{ body: IProduct }> & {
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const coverImage = Array.isArray(mappedFiles.coverImage)
      ? mappedFiles.coverImage[0]?.fileUrl
      : mappedFiles.coverImage?.fileUrl;

    const body = req.body as IProduct;
    const manualUpload = Array.isArray(mappedFiles.manualUrl)
      ? mappedFiles.manualUrl[0]?.fileUrl
      : mappedFiles.manualUrl?.fileUrl;

    const brochureUpload = Array.isArray(mappedFiles.brochureUrl)
      ? mappedFiles.brochureUrl[0]?.fileUrl
      : mappedFiles.brochureUrl?.fileUrl;

    const detailImageUploads = Array.isArray(mappedFiles.detailImage)
      ? mappedFiles.detailImage
          .map((item) => item?.fileUrl)
          .filter((url): url is string => typeof url === "string")
      : mappedFiles.detailImage?.fileUrl
      ? [mappedFiles.detailImage.fileUrl]
      : [];

    const detailImageFromBody = Array.isArray(body.detailImage)
      ? body.detailImage
      : undefined;

    const detailImage =
      detailImageUploads.length > 0 ? detailImageUploads : detailImageFromBody;

    const data: IProduct = {
      ...body,
      coverImage,
    };

    if (manualUpload) {
      data.manualUrl = manualUpload;
    }

    if (brochureUpload) {
      data.brochureUrl = brochureUpload;
    }

    if (detailImage !== undefined) {
      data.detailImage = detailImage;
    }
    const result = await this.productService.createProduct(data);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "Product already exists"
      );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Associated subcategory not found"
      );

    deleteCache("products:*").catch(console.error);

    return res
      .status(result.status)
      .json({ status: result.status, message: "Product created successfully" });
  }

  async getAllProducts(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `products:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.productService.getAllProducts(
      page,
      limit,
      search
    );

    await setCache(cacheKey, JSON.stringify(result.data));

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data, cached: false });
  }

  async getProductsBySubcategory(
    req: AuthenticatedRequest<{ subcategoryId: string }>,
    res: Response
  ) {
    const subcategoryId = req.params.subcategoryId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.productService.getProductsBySubCategory(
      subcategoryId,
      page,
      limit
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Subcategory not found");

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data });
  }

  async exportProductsToExcel(req: AuthenticatedRequest, res: Response) {
    const search = (req.query.search as string) || "";
    const { page, limit, fields } = this.parseExportRequest(req);
    const products = await this.productService.getProductsForExport(
      search,
      page,
      limit,
      fields
    );

    const columns = [
      {
        header: "S.N",
        key: "sn",
        width: 6,
        alignment: { horizontal: "center" as const },
      },
      { header: "Name", key: "name", width: 28 },
      { header: "SKU", key: "sku", width: 18 },
      { header: "Subcategory", key: "subcategory", width: 22 },
      {
        header: "Price",
        key: "price",
        width: 14,
        alignment: { horizontal: "right" as const },
      },
      {
        header: "Yearly Price",
        key: "yearlyPrice",
        width: 16,
        alignment: { horizontal: "right" as const },
      },
      {
        header: "MRP",
        key: "mrp",
        width: 14,
        alignment: { horizontal: "right" as const },
      },
      {
        header: "Published",
        key: "isPublished",
        width: 12,
        alignment: { horizontal: "center" as const },
      },
      {
        header: "Popular",
        key: "isPopular",
        width: 12,
        alignment: { horizontal: "center" as const },
      },
      {
        header: "Listed Date",
        key: "createdAt",
        width: 20,
        alignment: { horizontal: "center" as const },
      },
    ];

    const rows = this.mapProductRows(products);

    await writeExcelResponse(
      res,
      "products",
      columns,
      rows,
      "Product Catalogue"
    );
  }

  async exportProductsToPdf(req: AuthenticatedRequest, res: Response) {
    const search = (req.query.search as string) || "";
    const { page, limit, fields } = this.parseExportRequest(req);
    const products = await this.productService.getProductsForExport(
      search,
      page,
      limit,
      fields
    );

    const columns = [
      { header: "S.N", key: "sn", width: 28 },
      { header: "Name", key: "name" },
      { header: "SKU", key: "sku", width: 70 },
      { header: "Subcategory", key: "subcategory", width: 90 },
      { header: "Price", key: "price", width: 60 },
      { header: "Yearly Price", key: "yearlyPrice", width: 74 },
      { header: "MRP", key: "mrp", width: 60 },
      { header: "Published", key: "isPublished", width: 60 },
      { header: "Popular", key: "isPopular", width: 60 },
      { header: "Listed Date", key: "createdAt", width: 92 },
    ];

    const rows = this.mapProductRows(products);

    await writePdfResponse(res, "products", "Product Catalogue", columns, rows);
  }

  async getProductById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const identifier = req.params.identifier;
    const result = await this.productService.getProductById(identifier);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product or related resource not found"
      );

    return res.status(StatusCode.OK).json({
      status: result.status,
      product: result.product,
      similarProducts: result.similarProducts ?? [],
    });
  }

  async updateProduct(
    req: AuthenticatedRequest<{ id: string }> & {
      body: IProduct;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const id = req.params.id;
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const coverImage = Array.isArray(mappedFiles.coverImage)
      ? mappedFiles.coverImage[0]?.fileUrl
      : mappedFiles.coverImage?.fileUrl;

    const body = req.body as IProduct;

    const manualUpload = Array.isArray(mappedFiles.manualUrl)
      ? mappedFiles.manualUrl[0]?.fileUrl
      : mappedFiles.manualUrl?.fileUrl;

    const brochureUpload = Array.isArray(mappedFiles.brochureUrl)
      ? mappedFiles.brochureUrl[0]?.fileUrl
      : mappedFiles.brochureUrl?.fileUrl;

    const detailImageUploads = Array.isArray(mappedFiles.detailImage)
      ? mappedFiles.detailImage
          .map((item) => item?.fileUrl)
          .filter((url): url is string => typeof url === "string")
      : mappedFiles.detailImage?.fileUrl
      ? [mappedFiles.detailImage.fileUrl]
      : [];

    const detailImageFromBody = Array.isArray(body.detailImage)
      ? body.detailImage
      : undefined;

    const detailImage =
      detailImageUploads.length > 0 ? detailImageUploads : detailImageFromBody;

    const data: IProduct = {
      ...body,
      coverImage,
    };

    if (manualUpload) {
      data.manualUrl = manualUpload;
    }

    if (brochureUpload) {
      data.brochureUrl = brochureUpload;
    }

    if (detailImage !== undefined) {
      data.detailImage = detailImage;
    }

    const result = await this.productService.updateProduct(id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product or related resource not found"
      );

    deleteCache("products:*").catch(console.error);

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, message: "Product updated successfully" });
  }

  async deleteProduct(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.productService.deleteProduct(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Product deleted successfully",
      deletedProductIds: result.deletedProductIds,
    });
  }

  async destroyProduct(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.productService.hardDeleteProducts(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one product ID to destroy."
      );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Products permanently deleted",
      deletedProductIds: result.deletedProductIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async recoverDeletedProducts(
    req: AuthenticatedRequest<{ body: IProductRecover }>,
    res: Response
  ) {
    const { ids } = req.body as IProductRecover;
    const result = await this.productAdminService.recoverDeletedProducts(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one product ID to recover."
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Products recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
  async getDeletedProducts(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.productAdminService.getAllDeletedProducts(
      page,
      limit,
      search
    );

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }
  async getProductStats(req: any, res: Response) {
    const result = await this.productAdminService.getProductStats();

    return res.status(StatusCode.OK).json({
      status: result.status,
      data: result.data,
    });
  }

  private formatNumber(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "-";
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  }

  private toYesNo(value: unknown): "Yes" | "No" {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "yes" ? "Yes" : "No";
    }
    return value ? "Yes" : "No";
  }

  private parseExportRequest(req: AuthenticatedRequest) {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const fieldsParam = req.query.fields;
    const fields = Array.isArray(fieldsParam)
      ? (fieldsParam as string[])
      : typeof fieldsParam === "string"
      ? fieldsParam.split(",")
      : undefined;

    return { page, limit, fields };
  }

  private mapProductRows(rows: any[]) {
    return rows.map((product, index) => {
      const mapped: Record<string, unknown> = { sn: index + 1 };

      Object.entries(product).forEach(([key, value]) => {
        switch (key) {
          case "createdAt":
            mapped.createdAt = formatDateTime(value as any);
            break;
          case "isPublished":
          case "isPopular":
            mapped[key] = this.toYesNo(value);
            break;
          case "price":
          case "yearlyPrice":
          case "mrp":
            mapped[key] = this.formatNumber(value as any);
            break;
          default:
            mapped[key] = value === undefined || value === "" ? "-" : value;
        }
      });

      mapped.sn = mapped.sn ?? index + 1;
      mapped.isPublished =
        mapped.isPublished ?? this.toYesNo(product.isPublished);
      mapped.isPopular = mapped.isPopular ?? this.toYesNo(product.isPopular);

      if (!("createdAt" in mapped)) {
        mapped.createdAt = formatDateTime();
      }

      return mapped;
    });
  }
}
