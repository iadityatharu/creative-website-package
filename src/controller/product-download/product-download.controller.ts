import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IProductDownload } from "../../dto/product-download/product-download.interface";
import { ProductDownloadService } from "../../service/product-download/product-download.service";
import { expressError } from "../../utils/expressError";
import { Platform } from "../../constant/enum.constant";
import { FileUploadMap } from "../../types/fileUploadtypes";
import axios from "axios";
import path from "path";
import { pipeline } from "stream/promises";
import { deleteCache } from "../../utils/redisClient";
import { RecoverDto } from "../../dto/recover.dto";

export class ProductDownloadController {
  private downloadService = new ProductDownloadService();

  async createDownload(
    req: AuthenticatedRequest<{ body: IProductDownload }> & {
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const payload = this.preparePayload(
      req.body as IProductDownload,
      req.fileUrls
    );

    if (!payload.downloadUrl) {
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Download file is required"
      );
    }

    const result = await this.downloadService.createDownload(payload);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product or category not found"
      );

    deleteCache("products:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: Message.CREATED,
    });
  }

  async getAllDownloads(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const productId = (req.query.productId as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const platform = (req.query.platform as Platform) || undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined;

    const result = await this.downloadService.getAllDownloads(
      page,
      limit,
      productId,
      categoryId,
      search,
      platform,
      isActive
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getDownloadById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.downloadService.getDownloadById(req.params.id);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product download not found"
      );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      download: result.download,
    });
  }

  async downloadFile(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const { id } = req.params;
    const result = await this.downloadService.getDownloadById(id);

    if (result.status === StatusCode.NOT_FOUND || !result.download)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product download not found"
      );

    const { download } = result;

    if (!download.downloadUrl) {
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Download file not available"
      );
    }

    try {
      const fileResponse = await axios.get(download.downloadUrl, {
        responseType: "stream",
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const contentType =
        fileResponse.headers["content-type"] || "application/octet-stream";
      const extension =
        this.extractExtension(download.downloadUrl, contentType) || "";
      const filename = this.buildFilename(download.title, extension);

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      await pipeline(fileResponse.data, res);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new expressError(
          StatusCode.NOT_FOUND,
          "Requested download file not found"
        );
      }

      throw new expressError(
        StatusCode.INTERNAL_SERVER_ERROR,
        "Unable to retrieve download file"
      );
    }
  }

  async updateDownload(
    req: AuthenticatedRequest<{ id: string; body: IProductDownload }> & {
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const payload = this.preparePayload(
      req.body as IProductDownload,
      req.fileUrls
    );
    const result = await this.downloadService.updateDownload(
      req.params.id,
      payload
    );

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Product and category mismatch"
      );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product download, product, or category not found"
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.UPDATED,
    });
  }

  async deleteDownload(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.downloadService.deleteDownload(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product download not found"
      );

    deleteCache("products:*").catch(console.error);

   return res.status(StatusCode.OK).json({
     status: StatusCode.OK,
     message: Message.DELETED,
     deletedDownloadIds: result.deletedDownloadIds,
   });
 }

  async destroyDownloads(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.downloadService.hardDeleteDownloads(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Product download not found"
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Product downloads permanently deleted",
      deletedDownloadIds: result.deletedDownloadIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async getDeletedDownloads(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const productId = (req.query.productId as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const platform = (req.query.platform as Platform) || undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined;

    const result = await this.downloadService.getDeletedDownloads(
      page,
      limit,
      productId,
      categoryId,
      search,
      platform,
      isActive
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverDownloads(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.downloadService.recoverDeletedDownloads(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one download ID to recover."
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Downloads recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  private preparePayload(
    body: IProductDownload,
    fileUrls?: FileUploadMap
  ): IProductDownload {
    const payload: IProductDownload = { ...body };

    payload.platforms = this.normalizePlatforms(payload.platforms);

    if (typeof payload.extra === "string") {
      try {
        payload.extra = JSON.parse(payload.extra);
      } catch {
        throw new expressError(StatusCode.BAD_REQUEST, "Invalid extra payload");
      }
    }

    const uploadUrl = fileUrls?.downloadUrl?.[0]?.fileUrl;
    if (uploadUrl) {
      payload.downloadUrl = uploadUrl;
    }

    if (payload.downloadUrl === undefined || payload.downloadUrl === null) {
      delete (payload as Record<string, unknown>).downloadUrl;
    }

    return payload;
  }

  private normalizePlatforms(
    value?: Platform[] | string
  ): Platform[] | undefined {
    if (Array.isArray(value)) {
      return value as Platform[];
    }

    if (typeof value === "string") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = undefined;
      }

      if (Array.isArray(parsed)) {
        return (parsed as unknown[])
          .map((item) => item?.toString().trim())
          .filter(Boolean) as Platform[];
      }

      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean) as Platform[];
    }

    return undefined;
  }

  private buildFilename(title?: string, extension?: string) {
    const base =
      title
        ?.trim()
        .replace(/[^a-z0-9\-_.]+/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "download";

    const sanitizedExt = extension
      ? extension.startsWith(".")
        ? extension
        : `.${extension}`
      : "";

    return `${base}${sanitizedExt}` || "download";
  }

  private extractExtension(urlString: string, contentType?: string) {
    try {
      const url = new URL(urlString);
      const ext = path.extname(url.pathname);
      if (ext) return ext;
    } catch {
      // ignore URL parsing issues
    }

    if (!contentType) return undefined;
    const [mime] = contentType.split(";");
    const normalized = mime.trim().toLowerCase();
    const mimeMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/json": ".json",
      "application/xml": ".xml",
      "text/xml": ".xml",
      "application/zip": ".zip",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/octet-stream": ".exe",
      "application/vnd.android.package-archive": ".apk",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/x-matroska": ".mkv",
    };

    return mimeMap[normalized];
  }
}

export default ProductDownloadController;
