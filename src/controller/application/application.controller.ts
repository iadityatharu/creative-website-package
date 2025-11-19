import { Response } from "express";
import { Application as ApplicationService } from "../../service/application/application.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { MediaMap } from "../../functions/mediaMap";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { IApplication } from "../../dto/application/application.interface";
import { RecoverDto } from "../../dto/recover.dto";

export class Application {
  private applicationService = new ApplicationService();
  private mediaMap = new MediaMap();

  async createApplication(
    req: AuthenticatedRequest & {
      body: IApplication;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);

    const resumeUrl = Array.isArray(mappedFiles.resumeUrl)
      ? mappedFiles.resumeUrl[0]?.fileUrl
      : mappedFiles.resumeUrl?.fileUrl;

    const coverLetterUrl = Array.isArray(mappedFiles.coverLetterUrl)
      ? mappedFiles.coverLetterUrl[0]?.fileUrl
      : mappedFiles.coverLetterUrl?.fileUrl;

    const data: IApplication = { ...req.body, resumeUrl, coverLetterUrl };
    const result = await this.applicationService.createApplication(data);

    deleteCache("applications:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: Message.CREATED,
    });
  }

  async getAllApplications(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `applications:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.applicationService.getAllApplications(
      page,
      limit,
      search
    );
    await setCache(cacheKey, JSON.stringify(result.data));

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data, cached: false });
  }

  async getApplicationById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const { id } = req.params;
    const result = await this.applicationService.getApplicationById(id);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Application not found");

    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data });
  }

  async updateApplication(
    req: AuthenticatedRequest<{ id: string }> & {
      body: IApplication;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const { id } = req.params;
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);

    const resumeUrl = Array.isArray(mappedFiles.resumeUrl)
      ? mappedFiles.resumeUrl[0]?.fileUrl
      : mappedFiles.resumeUrl?.fileUrl;

    const coverLetterUrl = Array.isArray(mappedFiles.coverLetterUrl)
      ? mappedFiles.coverLetterUrl[0]?.fileUrl
      : mappedFiles.coverLetterUrl?.fileUrl;

    const data: IApplication = { ...req.body, resumeUrl, coverLetterUrl };

    const result = await this.applicationService.updateApplication(id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Application not found");

    deleteCache("applications:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.UPDATED,
    });
  }

  async deleteApplication(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.applicationService.deleteApplication(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Application not found");

    deleteCache("applications:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.DELETED,
      deletedIds: result.deletedIds,
    });
  }

  async getDeletedApplications(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.applicationService.getDeletedApplications(
      page,
      limit,
      search
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverApplications(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.applicationService.recoverDeletedApplications(
      ids
    );

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one application ID to recover."
      );

    deleteCache("applications:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Applications recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
