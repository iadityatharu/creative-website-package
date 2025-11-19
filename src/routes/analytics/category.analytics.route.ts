import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import CategoryAnalyticsController from "../../controller/analytics/category.analytics.controller";

const router = Router();
const controller = new CategoryAnalyticsController();

router.get(
  "/overview",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getOverview.bind(controller))
);

router.get(
  "/top-categories",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getTopCategories.bind(controller))
);

router.get(
  "/:id/performance",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getCategoryPerformance.bind(controller))
);

export default router;
