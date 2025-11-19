import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
} from "class-validator";
import { regex } from "../../constant/regex.constant";

export class GenerateResetLinkDto {
  @IsOptional({ groups: ["create"] })
  @IsNotEmpty({ message: "Email is required", groups: ["create"] })
  @IsEmail({}, { message: "Email must be valid", groups: ["create"] })
  @Matches(regex.emailRegex, {
    message: "Invalid email",
  })
  email?: string;
}

export class ResetPasswordDto {
  @IsOptional({ groups: ["create"] })
  @IsNotEmpty({ message: "Token is required", groups: ["update"] })
  @IsString({ groups: ["create"] })
  token?: string;

  @IsOptional({ groups: ["create"] })
  @IsNotEmpty({ message: "Password cannot be empty", groups: ["create"] })
  @Matches(regex.passwordRegex, {
    message:
      "Password must be at least 6 characters long and include at least one letter, one number, and one special character.",
    groups: ["create"],
  })
  password?: string;

  @IsOptional({ groups: ["create"] })
  @IsNotEmpty({
    message: "Confirm password cannot be empty",
    groups: ["create"],
  })
  @Matches(regex.passwordRegex, {
    message:
      "Confirm password must be at least 6 characters long and include at least one letter, one number, and one special character.",
    groups: ["create"],
  })
  confirmPassword?: string;
}

export class ChangePasswordDto {
  @IsOptional({ groups: ["update"] })
  @IsNotEmpty({ message: "Current password is required", groups: ["update"] })
  currentPassword?: string;

  @IsOptional({ groups: ["update"] })
  @IsNotEmpty({ message: "New password is required", groups: ["update"] })
  @Matches(regex.passwordRegex, {
    message:
      "Password must be at least 6 characters long and include at least one letter, one number, and one special character.",
    groups: ["update"],
  })
  password?: string;

  @IsOptional({ groups: ["update"] })
  @IsNotEmpty({ message: "Confirm password is required", groups: ["update"] })
  @Matches(regex.passwordRegex, {
    message:
      "Confirm password must be at least 6 characters long and include at least one letter, one number, and one special character.",
    groups: ["update"],
  })
  confirmPassword?: string;
}
