import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Review } from "../../controller/review/review.controller";
import { ReviewDto } from "../../dto/review/review.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const review = new Review();

router.post(
  "/create-review",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(ReviewDto, "body", "create"),
  asyncHandler(review.createReview.bind(review))
);

router.get("/get-all-reviews", asyncHandler(review.getAllReviews.bind(review)));

router.get("/get-review/:id", asyncHandler(review.getReviewById.bind(review)));

router.put(
  "/update-review/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  validateRequest(ReviewDto, "body", "update"),
  asyncHandler(review.updateReview.bind(review))
);

router.delete(
  "/delete-review/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(review.deleteReview.bind(review))
);

router.delete(
  "/destroy-reviews/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(review.destroyReviews.bind(review))
);

router.get(
  "/deleted-reviews",
  authentication,
  isVerifiedUser,
  asyncHandler(review.getDeletedReviews.bind(review))
);

router.put(
  "/recover-reviews",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(review.recoverReviews.bind(review))
);

export default router;
