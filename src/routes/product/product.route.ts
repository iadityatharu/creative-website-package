import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Product } from "../../controller/product/product.controller";
import { ProductDto, ProductRecoverDto } from "../../dto/product/product.dto";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";

const router = Router();
const product = new Product();

router.post(
  "/create-product",
  authentication,
  isVerifiedUser,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "detailImage", maxCount: 10 },
    { name: "manualUrl", maxCount: 1 },
    { name: "brochureUrl", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(ProductDto, "body", "create"),
  asyncHandler(product.createProduct.bind(product))
);

router.put(
  "/update-product/:id",
  authentication,
  isVerifiedUser,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "detailImage", maxCount: 10 },
    { name: "manualUrl", maxCount: 1 },
    { name: "brochureUrl", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(ProductDto, "body", "update"),
  asyncHandler(product.updateProduct.bind(product))
);

router.get(
  "/export/excel",
  authentication,
  isVerifiedUser,
  asyncHandler(product.exportProductsToExcel.bind(product))
);

router.get(
  "/export/pdf",
  authentication,
  isVerifiedUser,
  asyncHandler(product.exportProductsToPdf.bind(product))
);

router.get(
  "/get-all-products",
  asyncHandler(product.getAllProducts.bind(product))
);

router.get(
  "/search-products",
  asyncHandler(product.searchProducts.bind(product))
);

router.get(
  "/get-subcategory-products/:subcategoryId",
  asyncHandler(product.getProductsBySubcategory.bind(product))
);

router.get(
  "/get-product/:identifier",
  asyncHandler(product.getProductById.bind(product))
);

router.delete(
  "/delete-product/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(product.deleteProduct.bind(product))
);

router.delete(
  "/destroy-product/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(product.destroyProduct.bind(product))
);

router.put(
  "/recover-products",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(ProductRecoverDto, "body"),
  asyncHandler(product.recoverDeletedProducts.bind(product))
);

router.get(
  "/stats",
  authentication,
  isVerifiedUser,
  asyncHandler(product.getProductStats.bind(product))
);

router.get(
  "/deleted-products",
  authentication,
  isVerifiedUser,
  asyncHandler(product.getDeletedProducts.bind(product))
);

export default router;
