import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { MediaType } from "express";

export class MediaAssetDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  type: MediaType;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
