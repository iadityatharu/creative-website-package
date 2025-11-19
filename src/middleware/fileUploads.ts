import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { expressError } from "../utils/expressError";
import { r2UploadUtil } from "../configs/r2UploadUtil";

const storage = multer.memoryStorage();

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-matroska",
  "application/pdf",
  "application/json",
  "application/xml",
  "text/xml",
  "application/vnd.android.package-archive",
  "application/x-msdownload",
  "application/octet-stream",
];

const allowedExtensions =
  /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|pdf|json|xml|apk|exe/;

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const extname = file.originalname.split(".").pop()?.toLowerCase() || "";

  const okByMime = allowedTypes.includes(file.mimetype);
  const okByExt = allowedExtensions.test(extname);

  if (okByMime || okByExt) {
    cb(null, true);
  } else {
    cb(
      new expressError(
        400,
        `Only images, videos, PDFs, JSON, XML, APK, and EXE files are allowed. Got mimetype=${file.mimetype} ext=${extname}`
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter,
});

const mapFilesWithFieldName = async (
  files: Express.Multer.File[] | { [field: string]: Express.Multer.File[] }
) => {
  let fileArray: Express.Multer.File[] = [];

  if (Array.isArray(files)) {
    fileArray = files;
  } else if (files && typeof files === "object") {
    fileArray = Object.values(files).flat();
  }

  const urls = await r2UploadUtil(fileArray, "uploads");
  const mapped: Record<string, { fileUrl: string; type: string }[]> = {};
  fileArray.forEach((file, i) => {
    if (!mapped[file.fieldname]) mapped[file.fieldname] = [];
    mapped[file.fieldname].push({
      fileUrl: urls[i],
      type: file.mimetype,
    });
  });

  return mapped;
};

export const fileUploadHandler =
  (required: boolean = true) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let files:
        | Express.Multer.File[]
        | { [field: string]: Express.Multer.File[] }
        | undefined;

      if (req.file) {
        files = [req.file]; // single
      } else if (req.files) {
        files = req.files; // could be array OR object
      }
      if (
        required &&
        (!files || (Array.isArray(files) && files.length === 0))
      ) {
        throw new expressError(400, "No files provided for upload.");
      }
      if (!files) return next();

      const structuredData = await mapFilesWithFieldName(files);
      (req as any).fileUrls = structuredData;

      next();
    } catch (err) {
      next(err);
    }
  };
