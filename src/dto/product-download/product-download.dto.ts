import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { Transform } from "class-transformer";
import { Platform } from "../../constant/enum.constant";

const toNum = (v: any) =>
  v === undefined || v === null || v === "" ? undefined : Number(v);

const toBool = (v: any) => {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return undefined;
};

const toJson = (v: any) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  }
  return v;
};

const toPlatforms = (v: any): Platform[] | undefined => {
  if (v === undefined || v === null || v === "") return undefined;

  const arr: string[] = Array.isArray(v)
    ? v.map(String)
    : (() => {
        if (typeof v === "string") {
          try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed)) return parsed.map(String);
          } catch {}
          return v.split(",").map((s) => s.trim());
        }
        return [];
      })();

  const map = (s: string): Platform => {
    const k = s.toLowerCase();
    if (["windows", "win"].includes(k)) return Platform.WINDOWS;
    if (["macos", "mac", "osx"].includes(k)) return Platform.MACOS;
    if (["linux"].includes(k)) return Platform.LINUX;
    if (["android"].includes(k)) return Platform.ANDROID;
    if (["ios", "iphone", "ipad"].includes(k)) return Platform.IOS;
    return Platform.OTHER;
  };

  return arr.filter(Boolean).map(map);
};

export class ProductDownloadDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  productId?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  categoryId?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  summary?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  version?: string;

  @IsDateString({ strict: true }, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  releasedOn?: string;

  @Transform(({ value }) => toNum(value))
  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  sizeBytes?: number;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  downloadUrl?: string;

  @Transform(({ value }) => toPlatforms(value))
  @IsArray({ groups: ["create", "update"] })
  @IsEnum(Platform, { each: true, groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  platforms?: Platform[];

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  minOsVersion?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  fileType?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  sha256?: string;

  @Transform(({ value }) => toBool(value))
  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  deprecated?: boolean;

  @Transform(({ value }) => toBool(value))
  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isActive?: boolean;

  @Transform(({ value }) => toNum(value))
  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  sortOrder?: number;

  @Transform(({ value }) => toJson(value))
  @IsOptional({ groups: ["create", "update"] })
  extra?: Record<string, unknown>;

  @Transform(({ value }) => toJson(value))
  @IsOptional({ groups: ["create", "update"] })
  mirrors?: Array<{ label: string; url: string }>;
}
