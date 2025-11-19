import Router from "express";
import { Signup } from "../../controller/user/signup.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateRequest } from "../../middleware/requestValidator";
import { UserDto } from "../../dto/user/signup.dto";
import { Signin } from "../../controller/user/signin.controller";
import { upload, fileUploadHandler } from "../../middleware/fileUploads";
import { Auth } from "../../controller/user/auth.controller";
import {
  ChangePasswordDto,
  GenerateResetLinkDto,
  ResetPasswordDto,
} from "../../dto/user/auth.dto";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";

const router = Router();
const signup = new Signup();
const signin = new Signin();
const auth = new Auth();

router.post(
  "/signup",
  upload.fields([{ name: "profile", maxCount: 1 }]),
  fileUploadHandler(false),
  validateRequest(UserDto, "body", "create"),
  asyncHandler(signup.signup.bind(signup))
);
router.post("/signin", asyncHandler(signin.signin.bind(signin)));

router.post(
  "/forgot-password",
  validateRequest(GenerateResetLinkDto, "body", "create"),
  asyncHandler(auth.generateResetLink.bind(auth))
);
router.patch(
  "/reset-password",
  validateRequest(ResetPasswordDto, "body", "create"),
  asyncHandler(auth.resetPassword.bind(auth))
);

router.patch(
  "/change-password",
  authentication,
  isVerifiedUser,
  validateRequest(ChangePasswordDto, "body", "update"),
  asyncHandler(auth.changePassword.bind(auth))
);

router.delete(
  "/logout",
  authentication,
  isVerifiedUser,
  asyncHandler(auth.logout.bind(auth))
);
export default router;
