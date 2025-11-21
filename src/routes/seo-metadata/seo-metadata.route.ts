import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import SeoMetadataController from "../../controller/seo-metadata/seo-metadata.controller";
import { SeoMetadataDto } from "../../dto/seo-metadata/seo-metadata.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";

const router = Router();
const controller = new SeoMetadataController();

router.post(
  "/create-seo",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  upload.fields([
    { name: "openGraphImages", maxCount: 1 },
    { name: "twitterImages", maxCount: 1 },
    { name: "sitemapFile", maxCount: 1 },
    { name: "manifestFile", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(SeoMetadataDto, "body", "create"),
  asyncHandler(controller.createSeoMetadata.bind(controller))
);

router.get(
  "/site-seo",
  asyncHandler(controller.getAllSiteSeoMetadata.bind(controller))
);

router.get(
  "/get-all-seo",
  asyncHandler(controller.getAllSeoMetadata.bind(controller))
);

router.get(
  "/get-seo/:id",
  asyncHandler(controller.getSeoMetadataById.bind(controller))
);

router.put(
  "/update-seo/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  upload.fields([
    { name: "openGraphImages", maxCount: 1 },
    { name: "twitterImages", maxCount: 1 },
    { name: "sitemapFile", maxCount: 1 },
    { name: "manifestFile", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(SeoMetadataDto, "body", "update"),
  asyncHandler(controller.updateSeoMetadata.bind(controller))
);

router.delete(
  "/delete-seo/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(controller.deleteSeoMetadata.bind(controller))
);

router.delete(
  "/destroy-seo/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(controller.destroySeoMetadata.bind(controller))
);

router.get(
  "/deleted-seo",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getDeletedSeoMetadata.bind(controller))
);

router.put(
  "/recover-seo",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(controller.recoverSeoMetadata.bind(controller))
);

export default router;
