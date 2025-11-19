import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Category } from "../../controller/category/category.controller";
import { CategoryDto } from "../../dto/category/category.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";

const router = Router();
const category = new Category();

router.post(
  "/create-category",
  authentication,
  isVerifiedUser,
  isAdmin,
  upload.fields([{ name: "coverImage", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(CategoryDto, "body", "create"),
  asyncHandler(category.createCategory.bind(category))
);

router.put(
  "/update-category/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  upload.fields([{ name: "coverImage", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(CategoryDto, "body", "update"),
  asyncHandler(category.updateCategory.bind(category))
);

router.get(
  "/get-all-categories",
  asyncHandler(category.getAllCategories.bind(category))
);

router.get(
  "/get-category/:identifier",
  asyncHandler(category.getCategoryById.bind(category))
);

router.delete(
  "/delete-category/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(category.deleteCategory.bind(category))
);

router.delete(
  "/destroy-category/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(category.destroyCategories.bind(category))
);

router.get(
  "/deleted-categories",
  authentication,
  isVerifiedUser,
  asyncHandler(category.getDeletedCategories.bind(category))
);

router.put(
  "/recover-categories",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(category.recoverCategories.bind(category))
);

export default router;
