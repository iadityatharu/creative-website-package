import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IProductDownloadCategory } from "../../dto/download-category/download-category.interface";
import { ProductDownloadCategoryService } from "../../service/download-category/download-category.service";
import { expressError } from "../../utils/expressError";
import { DownloadKind } from "../../constant/enum.constant";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { RecoverDto } from "../../dto/recover.dto";

export class ProductDownloadCategoryController {
  private categoryService = new ProductDownloadCategoryService();

  async createCategory(
    req: AuthenticatedRequest<{ body: IProductDownloadCategory }>,
    res: Response
  ) {
    const payload = { ...(req.body as IProductDownloadCategory) };

    if (typeof payload.extra === "string") {
      try {
        payload.extra = JSON.parse(payload.extra);
      } catch {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          "Invalid extra payload"
        );
      }
    }

    const result = await this.categoryService.createCategory(payload);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    deleteCache("downloadCategories:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: Message.CREATED,
    });
  }

  async getAllCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const productId = (req.query.productId as string) || undefined;
    const search = (req.query.search as string) || "";
    const kind = (req.query.kind as DownloadKind) || undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined;

    const cacheKey = `downloadCategories:${page}:${limit}:${
      productId || "all"
    }:${kind || "all"}:${search}:${isActive === undefined ? "all" : isActive}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        message: Message.FOUND,
        data: cached,
        cached: true,
      });
    }

    const result = await this.categoryService.getAllCategories(
      page,
      limit,
      productId,
      kind,
      search,
      isActive
    );

    await setCache(cacheKey, JSON.stringify(result.data));

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
      cached: false,
    });
  }

  async getCategoryById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.categoryService.getCategoryById(req.params.id);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Download category not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      category: result.category,
    });
  }

  async updateCategory(
    req: AuthenticatedRequest<{ id: string; body: IProductDownloadCategory }>,
    res: Response
  ) {
    const payload = { ...(req.body as IProductDownloadCategory) };

    if (typeof payload.extra === "string") {
      try {
        payload.extra = JSON.parse(payload.extra);
      } catch {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          "Invalid extra payload"
        );
      }
    }

    const result = await this.categoryService.updateCategory(
      req.params.id,
      payload
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Download category or product not found"
      );

    deleteCache("downloadCategories:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.UPDATED,
    });
  }

  async deleteCategory(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.categoryService.deleteCategory(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Download category not found");

    deleteCache("downloadCategories:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.DELETED,
      deletedCategoryIds: result.deletedCategoryIds,
    });
  }

  async getDeletedCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const productId = (req.query.productId as string) || undefined;
    const search = (req.query.search as string) || "";
    const kind = (req.query.kind as DownloadKind) || undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined;

    const result = await this.categoryService.getDeletedCategories(
      page,
      limit,
      productId,
      kind,
      search,
      isActive
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async recoverCategories(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;

    const result = await this.categoryService.recoverDeletedCategories(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one download category ID to recover."
      );

    deleteCache("downloadCategories:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Download categories recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyCategories(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.categoryService.hardDeleteCategories(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Download category not found"
      );

    deleteCache("downloadCategories:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Download categories permanently deleted",
      deletedCategoryIds: result.deletedCategoryIds,
      deletedAssets: result.deletedAssets,
    });
  }
}

export default ProductDownloadCategoryController;
