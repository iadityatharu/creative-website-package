import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { CategoryAnalyticsService } from "../../src/service/analytics/category.analytics.service";
import { StatusCode } from "../../src/constant/statusCode.interface";

describe("Category Analytics Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns overview data", async () => {
    jest
      .spyOn(CategoryAnalyticsService.prototype, "getOverview")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          totalCategories: 12,
          categoriesWithBrand: 10,
          categoriesWithSubCategories: 8,
          categoriesWithProducts: 6,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/category/overview"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("totalCategories");
  });

  it("returns top categories", async () => {
    jest
      .spyOn(CategoryAnalyticsService.prototype, "getTopCategories")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          categories: [{ id: "1", title: "AC", productCount: 5 }],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/category/top-categories"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("categories");
  });

  it("returns category performance", async () => {
    jest
      .spyOn(CategoryAnalyticsService.prototype, "getCategoryPerformance")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          category: { id: "1", title: "AC" },
          totals: { products: 10, published: 8, popular: 3 },
          latestProducts: [],
          subcategoryBreakdown: [],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/category/1/performance"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("category");
  });
});
