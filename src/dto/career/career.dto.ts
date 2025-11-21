import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { JobType } from "../../constant/enum.constant";

export class CareerDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  slug: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  department: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  location: string;

  @IsEnum(JobType, { groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  jobType: JobType;

  @IsOptional({ groups: ["create", "update"] })
  description?: string | Record<string, unknown>;

  @IsOptional({ groups: ["create", "update"] })
  requirements?: string;

  @IsOptional({ groups: ["create", "update"] })
  salaryRange?: string;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isOpen?: boolean;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
