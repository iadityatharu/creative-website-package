import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { ProductDownloadService } from "../../src/service/product-download/product-download.service";
import { StatusCode } from "../../src/constant/statusCode.interface";
import { Platform } from "../../src/constant/enum.constant";

describe("Product Download Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a product download", async () => {
    jest
      .spyOn(ProductDownloadService.prototype, "createDownload")
      .mockResolvedValue({ status: StatusCode.CREATED });

    const res = await request(app)
      .post("/api/v1/creative/product-download/create-download")
      .send({
        productId: "prod-1",
        categoryId: "cat-1",
        title: "Firmware v1.0",
        downloadUrl: "https://cdn.example.com/fw.bin",
        platforms: [Platform.WINDOWS],
      });

    expect(res.status).toBe(StatusCode.CREATED);
    expect(res.body.message).toBe("Created");
  });

  it("lists product downloads", async () => {
    jest
      .spyOn(ProductDownloadService.prototype, "getAllDownloads")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          downloads: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/product-download/get-all-downloads"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("downloads");
  });

  it("gets a product download by id", async () => {
    const download: any = { id: "dl-1", title: "Firmware v1.0" };

    jest
      .spyOn(ProductDownloadService.prototype, "getDownloadById")
      .mockResolvedValue({ status: StatusCode.OK, download });

    const res = await request(app).get(
      "/api/v1/creative/product-download/get-download/dl-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.download).toEqual(download);
  });

  it("updates a product download", async () => {
    jest
      .spyOn(ProductDownloadService.prototype, "updateDownload")
      .mockResolvedValue({ status: StatusCode.OK });

    const res = await request(app)
      .put("/api/v1/creative/product-download/update-download/dl-1")
      .send({ title: "Firmware v1.1" });

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.message).toBe("Updated");
  });

  it("deletes a product download", async () => {
    jest
      .spyOn(ProductDownloadService.prototype, "deleteDownload")
      .mockResolvedValue({
        status: StatusCode.OK,
        deletedDownloadIds: ["dl-1"],
      });

    const res = await request(app).delete(
      "/api/v1/creative/product-download/delete-download/dl-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.deletedDownloadIds).toContain("dl-1");
  });
});
