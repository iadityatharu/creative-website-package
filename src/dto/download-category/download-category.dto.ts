import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { DownloadKind } from "../../constant/enum.constant";

export class ProductDownloadCategoryDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  productId?: string;

  @IsEnum(DownloadKind, { groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  kind?: DownloadKind;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  subtitle?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  iconKey?: string;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isActive?: boolean;

  @IsNumber({}, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  sortOrder?: number;

  @IsOptional({ groups: ["create", "update"] })
  extra?: Record<string, unknown>;
}
