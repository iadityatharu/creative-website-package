import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";
import { Application } from "../../controller/application/application.controller";
import { ApplicationDto } from "../../dto/application/application.dto";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const controller = new Application();

router.post(
  "/create-application",
  upload.fields([
    { name: "resumeUrl", maxCount: 1 },
    { name: "coverLetterUrl", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(ApplicationDto, "body", "create"),
  asyncHandler(controller.createApplication.bind(controller))
);

router.get(
  "/get-all-applications",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getAllApplications.bind(controller))
);

router.get(
  "/get-application/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getApplicationById.bind(controller))
);

router.put(
  "/update-application/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  upload.fields([
    { name: "resumeUrl", maxCount: 1 },
    { name: "coverLetterUrl", maxCount: 1 },
  ]),
  fileUploadHandler(false),
  validateRequest(ApplicationDto, "body", "update"),
  asyncHandler(controller.updateApplication.bind(controller))
);

router.delete(
  "/delete-application/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.deleteApplication.bind(controller))
);

router.get(
  "/deleted-applications",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getDeletedApplications.bind(controller))
);

router.put(
  "/recover-applications",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(controller.recoverApplications.bind(controller))
);

export default router;
