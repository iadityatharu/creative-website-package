import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsNumber,
} from "class-validator";

export class ReviewDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  reviewerName: string;

  @IsEmail({}, { groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  reviewerEmail: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  comment: string;

  @IsInt({ groups: ["create", "update"] })
  @Min(1, { groups: ["create", "update"] })
  @Max(5, { groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  rating: number;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isPublished?: boolean;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
