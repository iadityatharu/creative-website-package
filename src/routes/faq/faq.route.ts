import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { FaqController } from "../../controller/faq/faq.controller";
import { FaqDto } from "../../dto/faq/faq.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";

const router = Router();
const faq = new FaqController();

router.post(
  "/create-faq",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(FaqDto, "body", "create"),
  asyncHandler(faq.createFaq.bind(faq))
);

router.get("/get-all-faq", asyncHandler(faq.getAllFaqs.bind(faq)));

router.get(
  "/get-faq/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(faq.getFaqById.bind(faq))
);

router.put(
  "/update-faq/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(FaqDto, "body", "update"),
  asyncHandler(faq.updateFaq.bind(faq))
);

router.delete(
  "/delete-faq/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(faq.deleteFaq.bind(faq))
);

router.get(
  "/deleted-faqs",
  authentication,
  isVerifiedUser,
  asyncHandler(faq.getDeletedFaqs.bind(faq))
);

router.put(
  "/recover-faqs",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(faq.recoverFaqs.bind(faq))
);

router.delete(
  "/destroy-faqs/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(faq.destroyFaqs.bind(faq))
);

export default router;
