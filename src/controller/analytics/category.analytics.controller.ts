import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { CategoryAnalyticsService } from "../../service/analytics/category.analytics.service";
import { expressError } from "../../utils/expressError";

export class CategoryAnalyticsController {
  private analyticsService = new CategoryAnalyticsService();

  async getOverview(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getOverview();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getTopCategories(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const result = await this.analyticsService.getTopCategories(limit);
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getCategoryPerformance(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const result = await this.analyticsService.getCategoryPerformance(
      req.params.id
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Category not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.FOUND,
      data: result.data,
    });
  }
}

export default CategoryAnalyticsController;
