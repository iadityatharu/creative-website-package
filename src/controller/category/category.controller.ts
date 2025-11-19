import { Response } from "express";
import { Category as CategoryService } from "../../service/category/category.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { ICategory } from "../../dto/category/category.interface";
import { RecoverDto } from "../../dto/recover.dto";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { MediaMap } from "../../functions/mediaMap";

export class Category {
  private categoryService = new CategoryService();
  private mediaMap = new MediaMap();

  async createCategory(
    req: AuthenticatedRequest<{ body: ICategory }> & {
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const coverImage = mappedFiles.coverImage
      ? Array.isArray(mappedFiles.coverImage)
        ? mappedFiles.coverImage[0]?.fileUrl
        : mappedFiles.coverImage.fileUrl
      : undefined;

    const data: ICategory = {
      ...req.body,
      ...(coverImage !== undefined ? { coverImage } : {}),
    };
    const result = await this.categoryService.createCategory(data);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "Category already exists"
      );

    deleteCache("categories:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: "Category created successfully",
    });
  }

  async getAllCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `categories:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.categoryService.getAllCategories(
      page,
      limit,
      search
    );

    await setCache(cacheKey, JSON.stringify(result.data));

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data, cached: false });
  }

  async getCategoryById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const identifier = req.params.identifier;
    const result = await this.categoryService.getCategoryById(identifier);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, category: result.category });
  }

  async updateCategory(
    req: AuthenticatedRequest<{ id: string }> & {
      body: ICategory;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const id = req.params.id;
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const coverImage = mappedFiles.coverImage
      ? Array.isArray(mappedFiles.coverImage)
        ? mappedFiles.coverImage[0]?.fileUrl
        : mappedFiles.coverImage.fileUrl
      : undefined;

    const data: ICategory = {
      ...req.body,
      ...(coverImage !== undefined ? { coverImage } : {}),
    };

    const result = await this.categoryService.updateCategory(id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    deleteCache("categories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Category updated successfully",
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
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    deleteCache("categories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Category deleted successfully",
      deletedCategoryIds: result.deletedCategoryIds,
    });
  }

  async destroyCategories(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.categoryService.hardDeleteCategories(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, "Provide at least one category ID to destroy.");

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    deleteCache("categories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Categories permanently deleted",
      deletedCategoryIds: result.deletedCategoryIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async getDeletedCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result =
      await this.categoryService.getDeletedCategories(page, limit, search);

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }

  async recoverCategories(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.categoryService.recoverDeletedCategories(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one category ID to recover."
      );

    deleteCache("categories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Categories recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
