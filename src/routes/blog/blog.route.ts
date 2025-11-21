import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { fileUploadHandler, upload } from "../../middleware/fileUploads";
import { BlogPost } from "../../controller/blog/blog.controller";
import { BlogPostDto } from "../../dto/blog/blog.dto";
import { RecoverDto } from "../../dto/recover.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";

const router = Router();
const blog = new BlogPost();

router.post(
  "/create-blog",
  authentication,
  isVerifiedUser,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "mediaUrls", maxCount: 8 },
  ]),
  fileUploadHandler(false),
  validateRequest(BlogPostDto, "body", "create"),
  asyncHandler(blog.createBlog.bind(blog))
);

router.put(
  "/update-blog/:id",
  authentication,
  isVerifiedUser,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "mediaUrls", maxCount: 8 },
  ]),
  fileUploadHandler(false),
  validateRequest(BlogPostDto, "body", "update"),
  asyncHandler(blog.updateBlog.bind(blog))
);

router.get("/get-all-blogs", asyncHandler(blog.getAllBlogs.bind(blog)));

router.get("/get-blog/:identifier", asyncHandler(blog.getBlogById.bind(blog)));

router.delete(
  "/delete-blog/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(blog.deleteBlog.bind(blog))
);

router.get(
  "/deleted-blogs",
  authentication,
  isVerifiedUser,
  asyncHandler(blog.getDeletedBlogs.bind(blog))
);

router.put(
  "/recover-blogs",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(blog.recoverBlogs.bind(blog))
);

router.delete(
  "/destroy-blog/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(blog.destroyBlogs.bind(blog))
);

export default router;
