import Router from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { Admin } from "../../controller/user/admin.controller";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { validateRequest } from "../../middleware/requestValidator";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";
import { UserDto } from "../../dto/user/signup.dto";
import { isAdmin } from "../../middleware/isAdmin";

const router = Router();
const admin = new Admin();

router.post(
  "/create-users",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "profile", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(UserDto, "body", "create"),
  asyncHandler(admin.createUsers.bind(admin))
);
router.get(
  "/get-all-users",
  authentication,
  isVerifiedUser,
  asyncHandler(admin.getAllUsers.bind(admin))
);
router.get(
  "/get-users/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(admin.getUsersById.bind(admin))
);

router.put(
  "/update-users/:id",
  authentication,
  isVerifiedUser,
  upload.fields([{ name: "profile", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(UserDto, "body", "update"),
  asyncHandler(admin.updateUsers.bind(admin))
);
router.delete(
  "/delete-users/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(admin.deleteUsers.bind(admin))
);

export default router;
