import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import ProductDownloadController from "../../controller/product-download/product-download.controller";
import { ProductDownloadDto } from "../../dto/product-download/product-download.dto";
import { upload, fileUploadHandler } from "../../middleware/fileUploads";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const controller = new ProductDownloadController();

router.post(
  "/create-download",
  authentication,
  isVerifiedUser,
  upload.single("downloadUrl"),
  fileUploadHandler(false),
  validateRequest(ProductDownloadDto, "body", "create"),
  asyncHandler(controller.createDownload.bind(controller))
);

router.put(
  "/update-download/:id",
  authentication,
  isVerifiedUser,
  upload.single("downloadUrl"),
  fileUploadHandler(false),
  validateRequest(ProductDownloadDto, "body", "update"),
  asyncHandler(controller.updateDownload.bind(controller))
);

router.get(
  "/get-all-downloads",
  asyncHandler(controller.getAllDownloads.bind(controller))
);

router.get(
  "/get-download/:id",
  asyncHandler(controller.getDownloadById.bind(controller))
);

router.get(
  "/get-downloads-by-product/:productId",
  asyncHandler(controller.getDownloadsByProductId.bind(controller))
);

router.get(
  "/download-file/:id",
  asyncHandler(controller.downloadFile.bind(controller))
);

router.delete(
  "/delete-download/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.deleteDownload.bind(controller))
);

router.delete(
  "/destroy-downloads/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(controller.destroyDownloads.bind(controller))
);

router.get(
  "/deleted-downloads",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getDeletedDownloads.bind(controller))
);

router.put(
  "/recover-downloads",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(controller.recoverDownloads.bind(controller))
);

export default router;
