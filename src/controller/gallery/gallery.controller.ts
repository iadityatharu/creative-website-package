import { Response } from "express";
import { Gallery as GalleryService } from "../../service/gallery/gallery.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { MediaMap } from "../../functions/mediaMap";
import { IGallery } from "../../dto/gallery/gallery.interface";
import { RecoverDto } from "../../dto/recover.dto";

export class Gallery {
  private galleryService = new GalleryService();
  private mediaMap = new MediaMap();

  async createGallery(
    req: AuthenticatedRequest & { body: IGallery; fileUrls?: FileUploadMap },
    res: Response
  ) {
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap.mapAll(fileUrls);

    const mediaUrls: string[] = Array.isArray(mappedFiles.mediaAsset)
      ? mappedFiles.mediaAsset.map((m) => m.fileUrl)
      : mappedFiles.mediaAsset?.fileUrl
      ? [mappedFiles.mediaAsset.fileUrl]
      : [];

    const data: IGallery = {
      ...req.body,
      mediaUrls,
    };

    const result = await this.galleryService.createGallery(data);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        StatusCode.ALREADY_EXIST,
        "Gallery already exists"
      );

    deleteCache("galleries:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: Message.CREATED,
    });
  }

  async getAllGalleries(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `galleries:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.galleryService.getAllGalleries(
      page,
      limit,
      search
    );
    await setCache(cacheKey, JSON.stringify(result.data));

    return res.status(StatusCode.OK).json({
      status: result.status,
      data: result.data,
      cached: false,
    });
  }

  async getGalleryById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const identifier = req.params.identifier;
    const result = await this.galleryService.getGalleryById(identifier);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Gallery not found");

    return res.status(StatusCode.OK).json({
      status: result.status,
      gallery: result.gallery,
    });
  }

  async getGalleriesByProductId(
    req: AuthenticatedRequest<{ productId: string }>,
    res: Response
  ) {
    const { productId } = req.params;
    const result = await this.galleryService.getGalleriesByProductId(
      productId
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      galleries: result.galleries,
    });
  }

  async updateGallery(
    req: AuthenticatedRequest<{ id: string }> & {
      body: IGallery & { removeUrls?: string[] };
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const id = req.params.id;
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap.mapAll(fileUrls);

    const mediaUrls: string[] = Array.isArray(mappedFiles.mediaAsset)
      ? mappedFiles.mediaAsset.map((m) => m.fileUrl)
      : mappedFiles.mediaAsset?.fileUrl
      ? [mappedFiles.mediaAsset.fileUrl]
      : [];

    const { removeUrls, ...rest } = req.body;

    const data: IGallery & { removeUrls?: string[] } = {
      ...rest,
      mediaUrls,
      removeUrls,
    };

    const result = await this.galleryService.updateGallery(id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Gallery not found");

    deleteCache("galleries:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.UPDATED,
    });
  }

  async deleteGallery(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.galleryService.deleteGallery(ids);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Gallery not found");

    deleteCache("galleries:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.DELETED,
      deletedGalleryIds: result.deletedGalleryIds,
    });
  }

  async destroyGalleries(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.galleryService.hardDeleteGalleries(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Gallery not found");

    deleteCache("galleries:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Galleries permanently deleted",
      deletedGalleryIds: result.deletedGalleryIds,
      deletedAssets: result.deletedAssets,
    });
  }

  async getDeletedGalleries(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.galleryService.getDeletedGalleries(
      page,
      limit,
      search
    );

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }

  async recoverGalleries(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.galleryService.recoverDeletedGalleries(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one gallery ID to recover."
      );

    deleteCache("galleries:*").catch(console.error);
    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Galleries recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
