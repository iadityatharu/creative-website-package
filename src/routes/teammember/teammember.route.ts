import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";
import { TeamMember } from "../../controller/teammember/teammember.controller";
import { TeamMemberDto } from "../../dto/teammember/teammember.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const controller = new TeamMember();

router.post(
  "/create-member",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "image", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(TeamMemberDto, "body", "create"),
  asyncHandler(controller.createMember.bind(controller))
);

router.put(
  "/update-member/:id",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "image", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(TeamMemberDto, "body", "update"),
  asyncHandler(controller.updateMember.bind(controller))
);

router.get(
  "/get-all-members",
  asyncHandler(controller.getAllMembers.bind(controller))
);

router.get(
  "/get-member/:id",
  asyncHandler(controller.getMemberById.bind(controller))
);

router.delete(
  "/delete-member/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.deleteMember.bind(controller))
);

router.delete(
  "/destroy-members/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(controller.destroyMembers.bind(controller))
);

router.get(
  "/deleted-members",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getDeletedMembers.bind(controller))
);

router.put(
  "/recover-members",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(controller.recoverMembers.bind(controller))
);

export default router;
