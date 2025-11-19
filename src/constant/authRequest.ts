import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthUserPayload extends JwtPayload {
  id: string;
  role: string;
}

export interface FileUrl {
  fileUrl: string;
  type: string;
}

export interface FileUploadMap {
  [fieldName: string]: FileUrl[];
}

export interface AuthenticatedRequest<P = {}, B = {}>
  extends Request<P, any, B> {
  user?: AuthUserPayload;
  fileUrls?: FileUploadMap;
}
