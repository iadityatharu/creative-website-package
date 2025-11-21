import { IsString, IsOptional, IsNotEmpty, IsEnum, IsNumber } from "class-validator";
import { ApplicationStatus } from "../../constant/enum.constant";
import { IsE164Phone } from "../../decorator/isE164Phone.decorator";

export class ApplicationDto {
  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  name?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  email?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  position?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  @IsE164Phone({ message: "Phone number must be valid" })
  phone?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsEnum(ApplicationStatus, { groups: ["create", "update"] })
  status?: ApplicationStatus;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  careerId?: string;

   @IsOptional({ groups: ["create", "update"] })
   @IsNumber({}, { groups: ["create", "update"] })
   sortOrder?: number;
}
