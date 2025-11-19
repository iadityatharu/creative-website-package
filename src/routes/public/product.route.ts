import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ProductPublic } from "../../controller/product/product.public.controller";

const router = Router();
const controller = new ProductPublic();

router.get("/get-products", asyncHandler(controller.getAllProducts.bind(controller)));
router.get("/search", asyncHandler(controller.searchProducts.bind(controller)));

export default router;
