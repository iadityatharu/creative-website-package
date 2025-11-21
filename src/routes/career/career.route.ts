import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Career } from "../../controller/career/career.controller";
import { CareerDto } from "../../dto/career/career.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";

const router = Router();
const career = new Career();

router.post(
  "/create-career",
  authentication,
  isVerifiedUser,
  validateRequest(CareerDto, "body", "create"),
  asyncHandler(career.createCareer.bind(career))
);

router.get("/get-all-careers", asyncHandler(career.getAllCareers.bind(career)));

router.get(
  "/get-career/:identifier",
  asyncHandler(career.getCareerByIdentifier.bind(career))
);

router.put(
  "/update-career/:id",
  authentication,
  isVerifiedUser,
  validateRequest(CareerDto, "body", "update"),
  asyncHandler(career.updateCareer.bind(career))
);

router.delete(
  "/delete-career/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(career.deleteCareer.bind(career))
);

router.get(
  "/deleted-careers",
  authentication,
  isVerifiedUser,
  asyncHandler(career.getDeletedCareers.bind(career))
);

router.put(
  "/recover-careers",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(career.recoverCareers.bind(career))
);

router.delete(
  "/destroy-careers/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(career.destroyCareers.bind(career))
);

export default router;
