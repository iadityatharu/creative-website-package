import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import UserAnalyticsController from "../../controller/analytics/user.analytics.controller";

const router = Router();
const controller = new UserAnalyticsController();

router.get(
  "/overview",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getOverview.bind(controller))
);

router.get(
  "/clients",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getClientBreakdown.bind(controller))
);

router.get(
  "/geo",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getGeoDistribution.bind(controller))
);

router.get(
  "/geo/countries",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getCountryVisitors.bind(controller))
);

router.get(
  "/recent",
  authentication,
  isVerifiedUser,
  asyncHandler(controller.getRecentActivity.bind(controller))
);

export default router;
