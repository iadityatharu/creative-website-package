import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import SeoAnalyticsController from "../../controller/analytics/seo.analytics.controller";

const router = Router();
const controller = new SeoAnalyticsController();

router.get(
  "/overview",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getOverview.bind(controller))
);

router.get(
  "/entities",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getEntityBreakdown.bind(controller))
);

router.get(
  "/recent",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(controller.getRecentUpdates.bind(controller))
);

export default router;
