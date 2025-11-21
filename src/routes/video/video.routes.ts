import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Video } from "../../controller/video/video.controller";
import { VideoDto } from "../../dto/video/video.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const videoController = new Video();

router.post(
  "/create-video",
  authentication,
  isVerifiedUser,
  validateRequest(VideoDto, "body", "create"),
  asyncHandler(videoController.createVideo.bind(videoController))
);

router.put(
  "/update-video/:id",
  authentication,
  isVerifiedUser,
  validateRequest(VideoDto, "body", "update"),
  asyncHandler(videoController.updateVideo.bind(videoController))
);

router.get(
  "/get-all-videos",
  asyncHandler(videoController.getAllVideos.bind(videoController))
);

router.get(
  "/get-video/:identifier",
  asyncHandler(videoController.getVideoById.bind(videoController))
);

router.get(
  "/get-videos-by-product/:productId",
  asyncHandler(videoController.getVideosByProductId.bind(videoController))
);

router.delete(
  "/delete-video/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(videoController.deleteVideo.bind(videoController))
);

router.delete(
  "/destroy-videos/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  isSudoAdmin,
  asyncHandler(videoController.destroyVideos.bind(videoController))
);

router.get(
  "/deleted-videos",
  authentication,
  isVerifiedUser,
  asyncHandler(videoController.getDeletedVideos.bind(videoController))
);

router.put(
  "/recover-videos",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(videoController.recoverVideos.bind(videoController))
);

export default router;
