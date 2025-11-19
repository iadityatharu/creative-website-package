import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { ReplyController } from "../../controller/reply/reply.controller";
import { ReplyDto } from "../../dto/reply/reply.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const reply = new ReplyController();

router.post(
  "/create-reply",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(ReplyDto, "body", "create"),
  asyncHandler(reply.createReply.bind(reply))
);

router.get(
  "/get-all-replies",
  authentication,
  isVerifiedUser,
  asyncHandler(reply.getAllReplies.bind(reply))
);

router.get(
  "/get-reply/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(reply.getReplyById.bind(reply))
);

router.put(
  "/update-reply/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(ReplyDto, "body", "update"),
  asyncHandler(reply.updateReply.bind(reply))
);

router.delete(
  "/delete-reply/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(reply.deleteReply.bind(reply))
);

router.delete(
  "/destroy-replies/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(reply.destroyReplies.bind(reply))
);

router.get(
  "/deleted-replies",
  authentication,
  isVerifiedUser,
  asyncHandler(reply.getDeletedReplies.bind(reply))
);

router.put(
  "/recover-replies",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(reply.recoverReplies.bind(reply))
);

export default router;
