import { UserRole, Gender } from "./enum.constant";
import { FileUploadMap } from "../types/fileUploadtypes";

export enum Message {
  SUCCESS = "Success",
  CREATED = "Created",
  UPDATED = "Updated",
  DELETED = "Deleted Successfull",
  BAD_REQUEST = "Bad Request",
  UNAUTHORIZED = "Unauthorized",
  SESSION_EXPIRED = "Session Expired",
  INTERNAL_SERVER_ERROR = "Internal Server Error",
  NOT_FOUND = "NOT Found",
  FORBIDDEN = "Forbidden",
  PAGE_NOT_FOUND = "page not found",
  ALREADY_EXIST = "Already exist",
  FOUND = "FOUND",
}
export interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

export interface UserMetadataJob {
  userId?: string | null;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  os?: string | null;
  browser?: string | null;
  device?: string | null;
}

export interface SigninResult {
  status: number;
  id: string | null;
  role: UserRole | null;
  isVerified: boolean | null;
  accessToken: string | null;
  name: string | null;
}
export interface SignupData {
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string;
  gender: Gender;
  password: string;
  address: string;
  createdBy?: string;
  profilePicture?: string;
  oauthProvider?: string;
  oauthId?: string;
  role?: UserRole;
}

export interface ICreateCategory {
  title?: string;
  slug?: string;
  addToHome?: boolean;
  isActive?: boolean;
  image?: string;

  description?: string;

  fileUrls?: FileUploadMap;
  categoryId?: string;
}
