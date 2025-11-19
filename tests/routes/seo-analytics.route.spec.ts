import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { SeoAnalyticsService } from "../../src/service/analytics/seo.analytics.service";
import { StatusCode } from "../../src/constant/statusCode.interface";

describe("SEO Analytics Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns overview data", async () => {
    jest
      .spyOn(SeoAnalyticsService.prototype, "getOverview")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          totalRecords: 20,
          optimized: 12,
          indexable: 18,
          canonicalSet: 15,
          optimizationCoverage: 60,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/seo/overview"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("totalRecords");
  });

  it("returns entity breakdown", async () => {
    jest
      .spyOn(SeoAnalyticsService.prototype, "getEntityBreakdown")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          breakdown: [{ entityType: "PRODUCT", count: 10, optimized: 6 }],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/seo/entities"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("breakdown");
  });

  it("returns recent updates", async () => {
    jest
      .spyOn(SeoAnalyticsService.prototype, "getRecentUpdates")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          records: [{ id: "1", slug: "test" }],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/seo/recent"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("records");
  });
});
