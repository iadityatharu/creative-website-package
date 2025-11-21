import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import ProductDownloadCategoryController from "../../controller/download-category/download-category.controller";
import { ProductDownloadCategoryDto } from "../../dto/download-category/download-category.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";

const router = Router();
const controller = new ProductDownloadCategoryController();

router.post(
  "/create-category",
  authentication,
  isVerifiedUser,
  validateRequest(ProductDownloadCategoryDto, "body", "create"),
  asyncHandler(controller.createCategory.bind(controller))
);

router.put(
  "/update-category/:id",
  authentication,
  isVerifiedUser,
  validateRequest(ProductDownloadCategoryDto, "body", "update"),
  asyncHandler(controller.updateCategory.bind(controller))
);

router.get(
  "/get-all-categories",
  asyncHandler(controller.getAllCategories.bind(controller))
);

router.get(
  "/get-category/:id",
  asyncHandler(controller.getCategoryById.bind(controller))
);

router.delete(
  "/delete-category/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.deleteCategory.bind(controller))
);

router.get(
  "/deleted-categories",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getDeletedCategories.bind(controller))
);

router.put(
  "/recover-categories",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(controller.recoverCategories.bind(controller))
);

router.delete(
  "/destroy-categories/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(controller.destroyCategories.bind(controller))
);

export default router;
