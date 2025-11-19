import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { SeoAnalyticsService } from "../../service/analytics/seo.analytics.service";

export class SeoAnalyticsController {
  private analyticsService = new SeoAnalyticsService();

  async getOverview(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getOverview();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getEntityBreakdown(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getEntityBreakdown();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getRecentUpdates(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await this.analyticsService.getRecentUpdates(limit);
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }
}

export default SeoAnalyticsController;
