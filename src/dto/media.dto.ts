import { IsString, IsNotEmpty } from "class-validator";
import { MediaType } from "express";

export class MediaAssetDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  type: MediaType;
}
