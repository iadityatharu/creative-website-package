import { Response } from "express";
import { ReplyService } from "../../service/reply/reply.service";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IReply } from "../../dto/reply/reply.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { RecoverDto } from "../../dto/recover.dto";

export class ReplyController {
  private replyService = new ReplyService();

  async createReply(
    req: AuthenticatedRequest<{ body: IReply }>,
    res: Response
  ) {
    const data: IReply = req.body;

    if (req.user && req.user.id) data.repliedById = req.user.id;

    const result = await this.replyService.createReply(data);

    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ status: StatusCode.NOT_FOUND, message: Message.NOT_FOUND });

    return res
      .status(StatusCode.CREATED)
      .json({ status: StatusCode.CREATED, message: Message.CREATED });
  }

  async getAllReplies(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.replyService.getAllReplies(page, limit);
    return res
      .status(StatusCode.OK)
      .json({ status: result.status, data: result.data });
  }

  async getReplyById(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const result = await this.replyService.getReplyById(req.params.id);
    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ status: StatusCode.NOT_FOUND, message: Message.NOT_FOUND });
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      reply: result.reply,
    });
  }

  async updateReply(
    req: AuthenticatedRequest<{ id: string; body: IReply }>,
    res: Response
  ) {
    const result = await this.replyService.updateReply(req.params.id, req.body);
    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ status: StatusCode.NOT_FOUND, message: Message.NOT_FOUND });
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, message: Message.SUCCESS });
  }

  async deleteReply(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.replyService.deleteReply(ids);
    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ status: StatusCode.NOT_FOUND, message: Message.NOT_FOUND });
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, deletedReplyIds: result.deletedReplyIds });
  }

  async getDeletedReplies(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.replyService.getDeletedReplies(
      page,
      limit,
      search
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverReplies(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.replyService.recoverDeletedReplies(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      return res.status(StatusCode.BAD_REQUEST).json({
        status: StatusCode.BAD_REQUEST,
        message: "Provide at least one reply ID to recover",
      });

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Replies recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyReplies(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.replyService.hardDeleteReplies(ids);

    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ status: StatusCode.NOT_FOUND, message: Message.NOT_FOUND });

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Replies permanently deleted",
      deletedReplyIds: result.deletedReplyIds,
    });
  }
}
