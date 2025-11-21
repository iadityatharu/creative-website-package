import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CategoryDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  slug?: string;

  @IsOptional({ groups: ["create", "update"] })
  description?: string | Record<string, unknown>;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
