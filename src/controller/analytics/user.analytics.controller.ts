import { Response } from "express";
import { StatusCode } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { UserAnalyticsService } from "../../service/analytics/user.analytics.service";

export class UserAnalyticsController {
  private analyticsService = new UserAnalyticsService();

  async getOverview(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getOverview();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getClientBreakdown(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getClientBreakdown();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getGeoDistribution(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getGeoDistribution();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getRecentActivity(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await this.analyticsService.getRecentActivity(limit);
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }

  async getCountryVisitors(req: AuthenticatedRequest, res: Response) {
    const result = await this.analyticsService.getCountryVisitors();
    return res.status(StatusCode.OK).json({
      status: result.status,
      message: Message.FOUND,
      data: result.data,
    });
  }
}

export default UserAnalyticsController;
