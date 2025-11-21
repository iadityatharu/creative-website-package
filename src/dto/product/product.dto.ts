import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  ArrayNotEmpty,
  IsUUID,
} from "class-validator";
import { ProductType } from "../../constant/enum.constant";

export class ProductDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  name?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  slug?: string;

  @IsEnum(ProductType, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  productType?: ProductType;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  sku?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  model?: string;

  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  price?: number;

  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  yearlyPrice?: number;

  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  mrp?: number;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  shortDescription?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  description?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  technology?: string;

  @IsOptional({ groups: ["create", "update"] })
  feature?: any;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  metaTitle?: string;

  @IsArray({ groups: ["create", "update"] })
  @IsString({ each: true, groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  metatag?: string[];

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  metadescription?: string;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isPublished?: boolean;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  subcategoryId?: string;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isPopular?: boolean;

  @IsArray({ groups: ["update"] })
  @IsString({ each: true, groups: ["update"] })
  @IsOptional({ groups: ["update", "create"] })
  removeUrls?: string[];

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
  
}

export class ProductRecoverDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  ids: string[];
}
