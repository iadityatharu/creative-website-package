export enum UserRole {
  SUDOADMIN = "SUDOADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}
export enum JobType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  REMOTE = "REMOTE",
  INTERNSHIP = "INTERNSHIP",
}

export enum ApplicationStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}
export enum InquiryStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  CLOSED = "CLOSED",
}
export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
}

export enum SubscriberStatus {
  ACTIVE = "ACTIVE",
  UNSUBSCRIBED = "UNSUBSCRIBED",
  INACTIVE = "INACTIVE",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum ContactPurpose {
  CHANNEL_SALES = "Channel Sales",
  PROJECT_SALES = "Project Sales",
  ADMINISTRATION = "Administration",
  PROCUREMENT = "Procurement",
  CAREER = "Career",
}

export enum DownloadKind {
  DRIVER = "DRIVER",
  SOFTWARE = "SOFTWARE",
  FIRMWARE = "FIRMWARE",
  MANUAL = "MANUAL",
  BROCHURE = "BROCHURE",
}

export enum Platform {
  WINDOWS = "Windows",
  MACOS = "macOS",
  LINUX = "Linux",
  ANDROID = "Android",
  IOS = "iOS",
  OTHER = "Other",
}

export enum ProductType {
  PHYSICAL = "PHYSICAL",
  DIGITAL = "DIGITAL",
  SERVICE = "SERVICE",
  SAAS = "SAAS",
}

export enum SeoEntityType {
  PRODUCT = "PRODUCT",
  BRAND = "BRAND",
  CATEGORY = "CATEGORY",
  BLOG = "BLOG",
}

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type OpenGraphBlock = {
  title?: string;
  description?: string;
  type?: string;
  images?: OgImage[];
};

export type TwitterBlock = {
  card?: "summary" | "summary_large_image" | string;
  title?: string;
  description?: string;
  images?: string[];
};

export type RobotsGoogleBot = {
  index?: boolean;
  follow?: boolean;
  "max-video-preview"?: number;
  "max-image-preview"?: "none" | "standard" | "large" | string;
  "max-snippet"?: number;
};

export type RobotsBlock = {
  index?: boolean;
  follow?: boolean;
  googleBot?: RobotsGoogleBot;
};

export type AlternatesBlock = {
  canonical?: string;
  languages?: Record<string, string>;
};
