import { Response } from "express";
import { BlogPost as BlogPostService } from "../../service/blog/blog.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IBlogPost } from "../../dto/blog/blog.interface";
import { MediaMap } from "../../functions/mediaMap";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { RecoverDto } from "../../dto/recover.dto";

export class BlogPost {
  private blogService = new BlogPostService();
  private mediaMap = new MediaMap();

  async createBlog(
    req: AuthenticatedRequest & { body: IBlogPost; fileUrls?: FileUploadMap },
    res: Response
  ) {
    const userId = req.user.id;
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap.mapAll(fileUrls);

    const coverImage = Array.isArray(mappedFiles.coverImage)
      ? mappedFiles.coverImage[0]?.fileUrl
      : mappedFiles.coverImage?.fileUrl;

    const mediaUrls: string[] = Array.isArray(mappedFiles.mediaUrls)
      ? mappedFiles.mediaUrls.map((m) => m.fileUrl)
      : mappedFiles.mediaUrls?.fileUrl
      ? [mappedFiles.mediaUrls.fileUrl]
      : [];

    const data: IBlogPost = { ...req.body, coverImage, author: userId };

    const result = await this.blogService.createBlog(data, mediaUrls);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(StatusCode.ALREADY_EXIST, "Blog already exists");

    deleteCache("blogs:*").catch(console.error);
    return res
      .status(result.status)
      .json({ status: result.status, message: Message.CREATED });
  }

  async getAllBlogs(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `blogs:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached)
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        data: JSON.parse(cached),
        cached: true,
      });

    const result = await this.blogService.getAllBlogs(page, limit, search);
    await setCache(cacheKey, JSON.stringify(result.data));

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data, cached: false });
  }

  async getBlogById(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const result = await this.blogService.getBlogByIdentifier(
      req.params.identifier
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Blog not found");

    return res
      .status(StatusCode.OK)
      .json({
        status: result.status,
        blog: result.blog,
        similarBlogs: result.similarBlogs ?? [],
      });
  }

  async updateBlog(
    req: AuthenticatedRequest<{ id: string }> & {
      body: IBlogPost;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap.mapAll(fileUrls);

    const coverImage = Array.isArray(mappedFiles.coverImage)
      ? mappedFiles.coverImage[0]?.fileUrl
      : mappedFiles.coverImage?.fileUrl;

    const addedMediaUrls: string[] = Array.isArray(mappedFiles.mediaUrls)
      ? mappedFiles.mediaUrls.map((m) => m.fileUrl)
      : mappedFiles.mediaUrls?.fileUrl
      ? [mappedFiles.mediaUrls.fileUrl]
      : [];

    const removedMediaIds: string[] = req.body.removedMediaIds || [];

    const data: IBlogPost = { ...req.body, coverImage };

    const result = await this.blogService.updateBlog(
      req.params.id,
      data,
      addedMediaUrls,
      removedMediaIds
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Blog not found");

    deleteCache("blogs:*").catch(console.error);
    return res
      .status(StatusCode.OK)
      .json({ status: result.status, message: Message.UPDATED });
  }

  // Soft delete blog
  async deleteBlog(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.blogService.deleteBlog(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Blog not found");

    deleteCache("blogs:*").catch(console.error);
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.DELETED,
      deletedBlogIds: result.deletedBlogIds,
    });
  }

  async getDeletedBlogs(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.blogService.getDeletedBlogs(page, limit, search);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverBlogs(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.blogService.recoverDeletedBlogs(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    deleteCache("blogs:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Blogs recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyBlogs(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.blogService.hardDeleteBlogs(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, "Provide at least one blog ID to destroy.");

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Blog not found");

    deleteCache("blogs:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Blogs permanently deleted",
      deletedBlogIds: result.deletedBlogIds,
      deletedAssets: result.deletedAssets,
    });
  }
}
