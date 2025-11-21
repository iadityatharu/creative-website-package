import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsNumber,
} from "class-validator";

export class GalleryDto {
  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  caption?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsBoolean({ groups: ["create", "update"] })
  isHome?: boolean;

  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  @IsString({ groups: ["create", "update"] })
  productId?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsArray({ groups: ["create", "update"] })
  @IsString({ each: true, groups: ["create", "update"] })
  removeUrls?: string[];

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
