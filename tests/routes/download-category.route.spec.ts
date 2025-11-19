import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { ProductDownloadCategoryService } from "../../src/service/download-category/download-category.service";
import { StatusCode } from "../../src/constant/statusCode.interface";
import { DownloadKind } from "../../src/constant/enum.constant";

describe("Download Category Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a download category", async () => {
    jest
      .spyOn(ProductDownloadCategoryService.prototype, "createCategory")
      .mockResolvedValue({ status: StatusCode.CREATED });

    const res = await request(app)
      .post("/api/v1/creative/download-category/create-category")
      .send({
        productId: "prod-1",
        kind: DownloadKind.MANUAL,
        title: "Manuals",
      });

    expect(res.status).toBe(StatusCode.CREATED);
    expect(res.body.message).toBe("Created");
  });

  it("lists download categories", async () => {
    jest
      .spyOn(ProductDownloadCategoryService.prototype, "getAllCategories")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          categories: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/download-category/get-all-categories"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("categories");
  });

  it("gets a download category", async () => {
    const category: any = { id: "cat-1", title: "Manuals" };

    jest
      .spyOn(ProductDownloadCategoryService.prototype, "getCategoryById")
      .mockResolvedValue({ status: StatusCode.OK, category });

    const res = await request(app).get(
      "/api/v1/creative/download-category/get-category/cat-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.category).toEqual(category);
  });

  it("updates a download category", async () => {
    jest
      .spyOn(ProductDownloadCategoryService.prototype, "updateCategory")
      .mockResolvedValue({ status: StatusCode.OK });

    const res = await request(app)
      .put("/api/v1/creative/download-category/update-category/cat-1")
      .send({ title: "Updated Manuals" });

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.message).toBe("Updated");
  });

  it("deletes a download category", async () => {
    jest
      .spyOn(ProductDownloadCategoryService.prototype, "deleteCategory")
      .mockResolvedValue({
        status: StatusCode.OK,
        deletedCategoryIds: ["cat-1"],
      });

    const res = await request(app).delete(
      "/api/v1/creative/download-category/delete-category/cat-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.deletedCategoryIds).toContain("cat-1");
  });
});
