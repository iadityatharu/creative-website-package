import { Response } from "express";
import { Career as CareerService } from "../../service/career/career.service";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { ICareer } from "../../dto/career/career.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { expressError } from "../../utils/expressError";
import { RecoverDto } from "../../dto/recover.dto";

export class Career {
  private careerService = new CareerService();

  async createCareer(
    req: AuthenticatedRequest<{ body: ICareer }>,
    res: Response
  ) {
    const result = await this.careerService.createCareer(req.body);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(StatusCode.ALREADY_EXIST, "Career already exists");

    return res
      .status(result.status)
      .json({ status: result.status, message: Message.CREATED });
  }

  async getAllCareers(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const result = await this.careerService.getAllCareers(page, limit, search);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getCareerByIdentifier(
    req: AuthenticatedRequest<{ identifier: string }>,
    res: Response
  ) {
    const result = await this.careerService.getCareerByIdentifier(
      req.params.identifier
    );
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      career: result.career,
    });
  }

  async updateCareer(
    req: AuthenticatedRequest<{ id: string; body: ICareer }>,
    res: Response
  ) {
    const result = await this.careerService.updateCareer(
      req.params.id,
      req.body
    );
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);

    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(StatusCode.ALREADY_EXIST, "Career already exists");
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, message: Message.SUCCESS });
  }

  async deleteCareer(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.careerService.deleteCareer(ids);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      deletedCareerIds: result.deletedCareerIds,
    });
  }

  async getDeletedCareers(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.careerService.getDeletedCareers(
      page,
      limit,
      search
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverCareers(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.careerService.recoverDeletedCareers(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one career ID to recover."
      );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Careers recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyCareers(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.careerService.hardDeleteCareers(ids);
    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, "Provide at least one career ID to destroy.");
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Career not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Careers permanently deleted",
      deletedCareerIds: result.deletedCareerIds,
    });
  }
}
