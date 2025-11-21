import { Response } from "express";
import { Video as VideoService } from "../../service/video/video.service";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IVideo } from "../../dto/video/video.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { expressError } from "../../utils/expressError";
import { YouTubeUtil } from "../../functions/youtubeUtil";
import { deleteCache } from "../../utils/redisClient";
import { RecoverDto } from "../../dto/recover.dto";

export class Video {
  private videoService = new VideoService();

  async createVideo(
    req: AuthenticatedRequest<{ body: IVideo }>,
    res: Response
  ) {
    const body = req.body as IVideo;

    if (body.youtubeVideoId) {
      const extractedId = YouTubeUtil.extractVideoId(body.youtubeVideoId);
      if (extractedId) {
        body.youtubeVideoId = extractedId;
      } else if (body.youtubeVideoId.startsWith("http")) {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          "Invalid YouTube URL provided"
        );
      }
    }

    const result = await this.videoService.createVideo(body);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    deleteCache("products:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: Message.CREATED,
    });
  }

  async getAllVideos(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const productId = (req.query.productId as string) || undefined;

    const result = await this.videoService.getAllVideos(
      page,
      limit,
      search,
      productId
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getVideoById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const identifier = req.params.identifier;
    const result = await this.videoService.getVideoById(identifier);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Video not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      video: result.video,
    });
  }

  async getVideosByProductId(
    req: AuthenticatedRequest<{ productId: string }>,
    res: Response
  ) {
    const { productId } = req.params;
    const result = await this.videoService.getVideosByProductId(productId);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Product not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      videos: result.videos,
    });
  }

  async updateVideo(
    req: AuthenticatedRequest<{ id: string; body: IVideo }>,
    res: Response
  ) {
    const id = req.params.id;
    const body = req.body as IVideo;

    if (body.youtubeVideoId) {
      const extractedId = YouTubeUtil.extractVideoId(body.youtubeVideoId);
      if (extractedId) {
        body.youtubeVideoId = extractedId;
      } else if (body.youtubeVideoId.startsWith("http")) {
        throw new expressError(
          StatusCode.BAD_REQUEST,
          "Invalid YouTube URL provided"
        );
      }
    }

    const result = await this.videoService.updateVideo(id, body);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Video or product not found"
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.UPDATED,
    });
  }

  async deleteVideo(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.videoService.deleteVideo(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Video not found");

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.DELETED,
      deletedVideoIds: result.deletedVideoIds,
    });
  }

  async destroyVideos(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.videoService.hardDeleteVideos(ids);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Video not found");

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.DELETED,
      deletedVideoIds: result.deletedVideoIds,
    });
  }

  async getDeletedVideos(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const productId = (req.query.productId as string) || undefined;

    const result = await this.videoService.getDeletedVideos(
      page,
      limit,
      search,
      productId
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverVideos(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.videoService.recoverDeletedVideos(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one video ID to recover."
      );

    deleteCache("products:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.SUCCESS,
      recoveredCount: result.recoveredCount,
    });
  }
}
