import { Response } from "express";
import { Review as ReviewService } from "../../service/review/review.service";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IReview } from "../../dto/review/review.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { expressError } from "../../utils/expressError";
import { RecoverDto } from "../../dto/recover.dto";

export class Review {
  private reviewService = new ReviewService();

  async createReview(
    req: AuthenticatedRequest<{ body: IReview }>,
    res: Response
  ) {
    const result = await this.reviewService.createReview(req.body);
    return res
      .status(result.status)
      .json({ status: result.status, message: Message.CREATED });
  }

  async getAllReviews(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const result = await this.reviewService.getAllReviews(
      page,
      limit,
      search
    );
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getReviewById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.reviewService.getReviewById(req.params.id);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      review: result.review,
    });
  }

  async updateReview(
    req: AuthenticatedRequest<{ id: string; body: IReview }>,
    res: Response
  ) {
    const result = await this.reviewService.updateReview(
      req.params.id,
      req.body
    );
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, message: Message.SUCCESS });
  }

  async deleteReview(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.reviewService.deleteReview(ids);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      deletedReviewIds: result.deletedReviewIds,
    });
  }

  async getDeletedReviews(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.reviewService.getDeletedReviews(
      page,
      limit,
      search
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverReviews(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.reviewService.recoverDeletedReviews(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one review ID to recover."
      );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Reviews recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyReviews(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.reviewService.hardDeleteReviews(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Reviews permanently deleted",
      deletedReviewIds: result.deletedReviewIds,
    });
  }
}
