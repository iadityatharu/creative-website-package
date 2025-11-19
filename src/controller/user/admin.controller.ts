import { Admin as AdminService } from "../../service/user/admin.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { Message } from "../../constant/message.interface";
import { Response } from "express";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import { MediaMap } from "../../functions/mediaMap";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { SignupData } from "../../constant/interface.constant";

export class Admin {
  private adminService = new AdminService();
  private mediaMap = new MediaMap();

  async createUsers(req: AuthenticatedRequest, res: Response) {
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap?.mapAll(fileUrls);
    let profilePicture: string | undefined;
    const profile = mappedFiles?.profile;
    if (profile) {
      profilePicture = Array.isArray(profile)
        ? profile[0]?.fileUrl
        : profile.fileUrl;
    }
    const result = await this.adminService.createUsers(
      req.body as SignupData,
      req.user.name,
      profilePicture
    );
    if (result.status !== StatusCode.CREATED)
      throw new expressError(
        result.status,
        "User with this email or phone already exists"
      );
    await deleteCache("user:*");

    return res.status(StatusCode.CREATED).json({
      status: StatusCode.CREATED,
      message: "Admin created successfully",
    });
  }

  async updateUsers(
    req: AuthenticatedRequest<{ id: string }> & { fileUrls?: FileUploadMap },
    res: Response
  ) {
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap?.mapAll(fileUrls);
    let profilePicture: string | undefined;
    const profile = mappedFiles?.profile;
    if (profile) {
      profilePicture = Array.isArray(profile)
        ? profile[0]?.fileUrl
        : profile.fileUrl;
    }
    const updateData = {
      ...req.body,
      ...(profilePicture && { profilePicture }),
    };
    const result = await this.adminService.updateUsers(
      req.params.id,
      updateData
    );
    if (result.status !== StatusCode.OK)
      throw new expressError(result.status, "User not found");
    await deleteCache("user:*");
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Admin updated successfully",
    });
  }

  async deleteUsers(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids: string[] = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.adminService.deleteUsers(ids);
    if (result.status !== StatusCode.OK)
      throw new expressError(result.status, "User not found to delete");
    await deleteCache("user:*");
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Admin(s) deleted successfully",
      deletedAdminIds: result.deletedUserIds,
    });
  }

  async getUsersById(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const result = await this.adminService.getUsersById(req.params.id);

    if (result.status !== StatusCode.OK)
      throw new expressError(result.status, "User not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }
  async getAllUsers(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `user:${req.user.id}:page:${page}:limit:${limit}:search:${search}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        message: Message.FOUND,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    const result = await this.adminService.getAllUsers(page, limit, search);
    await setCache(cacheKey, JSON.stringify(result.data), 1800);

    return res.status(result.status).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
      cached: false,
    });
  }

}
