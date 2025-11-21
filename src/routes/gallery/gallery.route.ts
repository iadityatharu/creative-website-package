import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";
import { Gallery } from "../../controller/gallery/gallery.controller";
import { GalleryDto } from "../../dto/gallery/gallery.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const gallery = new Gallery();

router.post(
  "/create-gallery",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "mediaAsset", maxCount: 8 }]),
  fileUploadHandler(false),
  validateRequest(GalleryDto, "body", "create"),
  asyncHandler(gallery.createGallery.bind(gallery))
);

router.put(
  "/update-gallery/:id",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "mediaAsset", maxCount: 8 }]),
  fileUploadHandler(false),
  validateRequest(GalleryDto, "body", "update"),
  asyncHandler(gallery.updateGallery.bind(gallery))
);

router.get(
  "/get-all-galleries",
  asyncHandler(gallery.getAllGalleries.bind(gallery))
);

router.get(
  "/get-gallery/:identifier",
  asyncHandler(gallery.getGalleryById.bind(gallery))
);

router.get(
  "/get-galleries-by-product/:productId",
  asyncHandler(gallery.getGalleriesByProductId.bind(gallery))
);

router.delete(
  "/delete-gallery/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(gallery.deleteGallery.bind(gallery))
);

router.delete(
  "/destroy-gallery/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(gallery.destroyGalleries.bind(gallery))
);

router.get(
  "/deleted-galleries",
  authentication,
  isVerifiedUser,
  asyncHandler(gallery.getDeletedGalleries.bind(gallery))
);

router.put(
  "/recover-galleries",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(gallery.recoverGalleries.bind(gallery))
);

export default router;
