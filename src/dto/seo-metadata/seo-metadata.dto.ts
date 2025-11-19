import { IsEnum, IsOptional, IsString, IsUUID, IsBoolean } from "class-validator";
import { SeoEntityType } from "../../constant/enum.constant";

export class SeoMetadataDto {
  @IsEnum(SeoEntityType, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  entityType?: SeoEntityType;

  @IsUUID(undefined, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  entityId?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  slug?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  description?: string;

  @IsOptional({ groups: ["create", "update"] })
  keywords?: string[] | string | null;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  canonicalUrl?: string;

  @IsOptional({ groups: ["create", "update"] })
  openGraph?: any;

  @IsOptional({ groups: ["create", "update"] })
  twitter?: any;

  @IsOptional({ groups: ["create", "update"] })
  robots?: any;

  @IsOptional({ groups: ["create", "update"] })
  alternates?: any;

  @IsOptional({ groups: ["create", "update"] })
  jsonLd?: any;

  @IsOptional({ groups: ["create", "update"] })
  extraMeta?: any;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isIndexable?: boolean;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isOptimized?: boolean;
}
