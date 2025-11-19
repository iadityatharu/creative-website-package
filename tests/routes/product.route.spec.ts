import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { Product as ProductService } from "../../src/service/product/product.service";
import { StatusCode } from "../../src/constant/statusCode.interface";

describe("Product Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a product", async () => {
    jest
      .spyOn(ProductService.prototype, "createProduct")
      .mockResolvedValue({ status: StatusCode.CREATED });

    const res = await request(app)
      .post("/api/v1/creative/product/create-product")
      .send({
        name: "Test Product",
        slug: "test-product",
      });

    expect(res.status).toBe(StatusCode.CREATED);
    expect(res.body.message).toBe("Product created successfully");
  });

  it("returns existing products", async () => {
    jest
      .spyOn(ProductService.prototype, "getAllProducts")
      .mockResolvedValue({
        status: StatusCode.OK,
        data: {
          products: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });

    const res = await request(app).get(
      "/api/v1/creative/product/get-all-products"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("products");
  });

  it("returns a product by identifier", async () => {
    const mockProduct: any = { id: "prod-1", name: "Product 1" };

    jest
      .spyOn(ProductService.prototype, "getProductById")
      .mockResolvedValue({ status: StatusCode.OK, product: mockProduct });

    const res = await request(app).get(
      "/api/v1/creative/product/get-product/prod-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.product).toEqual(mockProduct);
  });

  it("updates a product", async () => {
    jest
      .spyOn(ProductService.prototype, "updateProduct")
      .mockResolvedValue({ status: StatusCode.OK });

    const res = await request(app)
      .put("/api/v1/creative/product/update-product/prod-1")
      .send({
        name: "Updated Product",
      });

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.message).toBe("Product updated successfully");
  });

  it("deletes a product", async () => {
    jest
      .spyOn(ProductService.prototype, "deleteProduct")
      .mockResolvedValue({
        status: StatusCode.OK,
        deletedProductIds: ["prod-1"],
      });

    const res = await request(app).delete(
      "/api/v1/creative/product/delete-product/prod-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.deletedProductIds).toContain("prod-1");
  });
});
