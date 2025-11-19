import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { UserAnalyticsService } from "../../src/service/analytics/user.analytics.service";
import { StatusCode } from "../../src/constant/statusCode.interface";

describe("User Analytics Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns overview data", async () => {
    jest
      .spyOn(UserAnalyticsService.prototype, "getOverview")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          totalRecords: 100,
          uniqueUsers: 40,
          uniqueIps: 60,
          uniqueCountries: 5,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/user/overview"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("uniqueUsers");
  });

  it("returns client breakdown", async () => {
    jest
      .spyOn(UserAnalyticsService.prototype, "getClientBreakdown")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          browsers: [{ label: "Chrome", count: 30 }],
          operatingSystems: [{ label: "Windows", count: 20 }],
          devices: [{ label: "Desktop", count: 25 }],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/user/clients"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("browsers");
  });

  it("returns geo distribution", async () => {
    jest
      .spyOn(UserAnalyticsService.prototype, "getGeoDistribution")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          locations: [{ country: "NP", count: 15 }],
        },
      });

    const res = await request(app).get("/api/v1/creative/analytics/user/geo");

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("locations");
  });

  it("returns recent activity", async () => {
    jest
      .spyOn(UserAnalyticsService.prototype, "getRecentActivity")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          records: [{ id: "1", browser: "Chrome" }],
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/analytics/user/recent"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("records");
  });
});
