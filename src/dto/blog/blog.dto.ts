import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
} from "class-validator";

export class BlogPostDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  slug?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  excerpt?: string;

  @IsOptional({ groups: ["create", "update"] })
  description?: any;

  @IsOptional({ groups: ["create", "update"] })
  @IsBoolean({ groups: ["create", "update"] })
  isPublished?: boolean;

  @IsOptional({ groups: ["create", "update"] })
  publishedAt?: Date;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  authorId?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  estimatedReadTime?: number;

  @IsOptional({ groups: ["create", "update"] })
  @IsArray({ groups: ["create", "update"] })
  @IsString({ each: true, groups: ["create", "update"] })
  removedMediaIds?: string[];

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
