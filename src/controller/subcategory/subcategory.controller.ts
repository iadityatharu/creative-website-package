import { Response } from "express";
import { SubCategory as SubCategoryService } from "../../service/subcategory/subcategory.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { ISubCategory } from "../../dto/subcategory/subcategory.interface";
import { RecoverDto } from "../../dto/recover.dto";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { MediaMap } from "../../functions/mediaMap";

export class SubCategory {
  private subCategoryService = new SubCategoryService();
  private mediaMap = new MediaMap();

  async createSubCategory(
    req: AuthenticatedRequest<{ body: ISubCategory }> & {
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

    const data: ISubCategory = {
      ...req.body,
      ...(coverImage !== undefined ? { coverImage } : {}),
    };
    const result = await this.subCategoryService.createSubCategory(data);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "SubCategory already exists"
      );

    deleteCache("subcategories:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: "SubCategory created successfully",
    });
  }

  async getAllSubCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `subcategories:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.subCategoryService.getAllSubCategories(
      page,
      limit,
      search
    );

    await setCache(cacheKey, JSON.stringify(result.data));

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data, cached: false });
  }

  async getSubCategoriesByCategory(
    req: AuthenticatedRequest<{ categoryId: string }>,
    res: Response
  ) {
    const categoryId = req.params.categoryId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.subCategoryService.getSubCategoriesByCategory(
      categoryId,
      page,
      limit
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data });
  }

  async getSubCategoryById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const identifier = req.params.identifier;
    const result = await this.subCategoryService.getSubCategoryById(identifier);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "SubCategory not found");

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, subCategory: result.subCategory });
  }

  async updateSubCategory(
    req: AuthenticatedRequest<{ id: string }> & {
      body: ISubCategory;
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

    const data: ISubCategory = {
      ...req.body,
      ...(coverImage !== undefined ? { coverImage } : {}),
    };

    const result = await this.subCategoryService.updateSubCategory(id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "SubCategory not found");

    deleteCache("subcategories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "SubCategory updated successfully",
    });
  }

  async deleteSubCategory(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.subCategoryService.deleteSubCategory(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "SubCategory not found");

    deleteCache("subcategories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "SubCategory deleted successfully",
      deletedSubCategoryIds: result.deletedSubCategoryIds,
    });
  }

  async destroySubCategories(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result =
      await this.subCategoryService.hardDeleteSubCategories(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one subcategory ID to destroy."
      );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "SubCategory not found");

    deleteCache("subcategories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "SubCategories permanently deleted",
      deletedSubCategoryIds: result.deletedSubCategoryIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async getDeletedSubCategories(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result =
      await this.subCategoryService.getDeletedSubCategories(
        page,
        limit,
        search
      );

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }

  async recoverSubCategories(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.subCategoryService.recoverDeletedSubCategories(
      ids
    );

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one subcategory ID to recover."
      );

    deleteCache("subcategories:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "SubCategories recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
