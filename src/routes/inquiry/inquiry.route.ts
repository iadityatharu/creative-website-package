import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Inquiry } from "../../controller/inquiry/inquiry.controller";
import { InquiryDto } from "../../dto/inquiry/inquiry.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const inquiry = new Inquiry();

router.post(
  "/create-inquiry",
  validateRequest(InquiryDto, "body", "create"),
  asyncHandler(inquiry.createInquiry.bind(inquiry))
);

router.get(
  "/export/excel",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.exportInquiriesToExcel.bind(inquiry))
);

router.get(
  "/export/pdf",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.exportInquiriesToPdf.bind(inquiry))
);

router.get(
  "/get-all-inquiries",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.getAllInquiries.bind(inquiry))
);

router.get(
  "/get-inquiry/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.getInquiryById.bind(inquiry))
);

router.put(
  "/update-inquiry/:id",
  authentication,
  isVerifiedUser,
  validateRequest(InquiryDto, "body", "update"),
  asyncHandler(inquiry.updateInquiry.bind(inquiry))
);

router.delete(
  "/delete-inquiry/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.deleteInquiry.bind(inquiry))
);

router.get(
  "/deleted-inquiries",
  authentication,
  isVerifiedUser,
  asyncHandler(inquiry.getDeletedInquiries.bind(inquiry))
);

router.put(
  "/recover-inquiries",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(inquiry.recoverInquiries.bind(inquiry))
);

router.delete(
  "/destroy-inquiries/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(inquiry.destroyInquiries.bind(inquiry))
);

export default router;
