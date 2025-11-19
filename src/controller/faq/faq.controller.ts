import { Response } from "express";
import { Faq as FaqService } from "../../service/faq/faq.service";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IFaq } from "../../dto/faq/faq.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { expressError } from "../../utils/expressError";
import { RecoverDto } from "../../dto/recover.dto";

export class FaqController {
  private faqService = new FaqService();

  async createFaq(req: AuthenticatedRequest<{ body: IFaq }>, res: Response) {
    const result = await this.faqService.createFaq(req.body);
    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        result.status,
        "FAQ with this title already exists"
      );
    return res
      .status(result.status)
      .json({ status: result.status, message: Message.CREATED });
  }

  async getAllFaqs(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const result = await this.faqService.getAllFaqs(page, limit, search);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getFaqById(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const result = await this.faqService.getFaqById(req.params.id);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(result.status, Message.NOT_FOUND);
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, message: Message.FOUND, faq: result.faq });
  }

  async updateFaq(
    req: AuthenticatedRequest<{ id: string; body: IFaq }>,
    res: Response
  ) {
    const result = await this.faqService.updateFaq(req.params.id, req.body);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(result.status, Message.NOT_FOUND);
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, message: Message.UPDATED });
  }

  async deleteFaq(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.faqService.deleteFaq(ids);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(result.status, Message.NOT_FOUND);
    return res
      .status(StatusCode.OK)
      .json({ status: StatusCode.OK, deletedFaqIds: result.deletedFaqIds });
  }

  async getDeletedFaqs(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const result = await this.faqService.getDeletedFaqs(page, limit, search);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async recoverFaqs(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.faqService.recoverDeletedFaqs(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "FAQs recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyFaqs(req: AuthenticatedRequest<{ id: string }>, res: Response) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];

    const result = await this.faqService.hardDeleteFaqs(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, Message.NOT_FOUND);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "FAQs permanently deleted",
      deletedFaqIds: result.deletedFaqIds,
    });
  }
}
