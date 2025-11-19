import { Response } from "express";
import { TeamMember as TeamMemberService } from "../../service/teammember/teammember.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { ITeamMember } from "../../dto/teammember/teammember.interface";
import { MediaMap } from "../../functions/mediaMap";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { RecoverDto } from "../../dto/recover.dto";

export class TeamMember {
  private memberService = new TeamMemberService();
  private mediaMap = new MediaMap();

  async createMember(
    req: AuthenticatedRequest & { body: ITeamMember; fileUrls?: FileUploadMap },
    res: Response
  ) {
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const image = Array.isArray(mappedFiles.image)
      ? mappedFiles.image[0]?.fileUrl
      : mappedFiles.image?.fileUrl;

    const data: ITeamMember = { ...req.body, image };
    const result = await this.memberService.createMember(data);

    return res.status(result.status).json({
      status: result.status,
      message: "Team member created successfully",
    });
  }

  async getAllMembers(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.memberService.getAllMembers(page, limit);
    return res.status(result.status).json(result);
  }

  async getMemberById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.memberService.getMemberById(req.params.id);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Member not found");

    return res.status(result.status).json(result);
  }

  async updateMember(
    req: AuthenticatedRequest<{ id: string }> & {
      body: ITeamMember;
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const mappedFiles = this.mediaMap.mapAll(req.fileUrls);
    const image = Array.isArray(mappedFiles.image)
      ? mappedFiles.image[0]?.fileUrl
      : mappedFiles.image?.fileUrl;

    const data: ITeamMember = { ...req.body, image };
    const result = await this.memberService.updateMember(req.params.id, data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Member not found");

    return res.status(result.status).json({
      status: result.status,
      message: "Team member updated successfully",
    });
  }

  async deleteMember(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const result = await this.memberService.deleteMember(req.params.id);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Member not found");

    return res.status(result.status).json({
      status: result.status,
      message: "Team member deleted successfully",
      deletedMember: result.deletedId,
    });
  }

  async destroyMembers(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.memberService.hardDeleteMembers(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Member not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Team members permanently deleted",
      deletedMembers: result.deletedIds,
    });
  }

  async getDeletedMembers(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.memberService.getDeletedMembers(
      page,
      limit,
      search
    );

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }

  async recoverMembers(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.memberService.recoverDeletedMembers(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one team member ID to recover."
      );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Team members recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
