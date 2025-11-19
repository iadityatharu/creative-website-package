import { Request, Response } from "express";
import { ProductPublicService } from "../../service/product/product.public.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { getCache, setCache } from "../../utils/redisClient";

export class ProductPublic {
  private service = new ProductPublicService();

  async getAllProducts(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const cacheKey = `products:${page}:${limit}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res
        .status(StatusCode.OK)
        .json({ status: StatusCode.OK, data: cached, cached: true });
    }

    const result = await this.service.getAllProducts(page, limit);

    if (result.status === StatusCode.OK && result.data) {
      await setCache(cacheKey, result.data);
    }

    return res
      .status(result.status)
      .json({ status: result.status, data: result.data });
  }

  async searchProducts(req: Request, res: Response) {
    const query = (req.query.q as string) || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.service.searchProducts(query, page, limit);

    return res
      .status(result.status)
      .json({ status: result.status, data: result.data });
  }
}
