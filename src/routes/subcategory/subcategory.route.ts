import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { SubCategory } from "../../controller/subcategory/subcategory.controller";
import { SubCategoryDto } from "../../dto/subcategory/subcategory.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";

const router = Router();
const subCategory = new SubCategory();

router.post(
  "/create-subcategory",
  authentication,
  isVerifiedUser,
  isAdmin,
  upload.fields([{ name: "coverImage", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(SubCategoryDto, "body", "create"),
  asyncHandler(subCategory.createSubCategory.bind(subCategory))
);

router.put(
  "/update-subcategory/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  upload.fields([{ name: "coverImage", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(SubCategoryDto, "body", "update"),
  asyncHandler(subCategory.updateSubCategory.bind(subCategory))
);

router.get(
  "/get-all-subcategories",
  asyncHandler(subCategory.getAllSubCategories.bind(subCategory))
);

router.get(
  "/get-category-subcategories/:categoryId",
  asyncHandler(subCategory.getSubCategoriesByCategory.bind(subCategory))
);

router.get(
  "/get-subcategory/:identifier",
  asyncHandler(subCategory.getSubCategoryById.bind(subCategory))
);

router.delete(
  "/delete-subcategory/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(subCategory.deleteSubCategory.bind(subCategory))
);

router.delete(
  "/destroy-subcategory/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(subCategory.destroySubCategories.bind(subCategory))
);

router.get(
  "/deleted-subcategories",
  authentication,
  isVerifiedUser,
  asyncHandler(subCategory.getDeletedSubCategories.bind(subCategory))
);

router.put(
  "/recover-subcategories",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(subCategory.recoverSubCategories.bind(subCategory))
);

export default router;
