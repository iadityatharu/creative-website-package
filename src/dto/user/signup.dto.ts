import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { Gender, UserRole } from "../../constant/enum.constant";
import { regex } from "../../constant/regex.constant";
import { IsE164Phone } from "../../decorator/isE164Phone.decorator";

export class UserDto {
  @IsString()
  @IsNotEmpty({ message: "Firstname is required", groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  firstname?: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  middlename?: string;

  @IsString()
  @IsNotEmpty({ message: "Lastname is required", groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  lastname?: string;

  @IsNotEmpty({ message: "Email cannot be empty", groups: ["create"] })
  @IsEmail({}, { message: "Email must be valid", groups: ["create", "update"] })
  @IsOptional({ groups: ["update"] })
  email?: string;

  @IsNotEmpty({ message: "Phone cannot be empty", groups: ["create"] })
  @IsE164Phone({
    message: "Phone number must be valid",
    groups: ["create", "update"],
  })
  @IsOptional({ groups: ["update"] })
  phone?: string;

  @IsNotEmpty({ message: "Password cannot be empty", groups: ["create"] })
  @Matches(regex.passwordRegex, {
    message:
      "Password must be at least 6 characters long and include at least one letter, one number, and one special character.",
    groups: ["create", "update"],
  })
  @IsOptional({ groups: ["update"] })
  password?: string;

  @IsString()
  @IsNotEmpty({ message: "Address is required", groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  address?: string;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isVerified?: boolean;

  @IsNotEmpty({ message: "Gender cannot be empty", groups: ["create"] })
  @IsEnum(Gender, { message: "Invalid gender", groups: ["create", "update"] })
  @IsOptional({ groups: ["update"] })
  gender?: Gender;

  @IsEnum(UserRole, {
    message: "Invalid role type",
    groups: ["create", "update"],
  })
  @IsOptional({ groups: ["create", "update"] })
  role?: UserRole;
}
