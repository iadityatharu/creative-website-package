import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { IsE164Phone } from "../../decorator/isE164Phone.decorator";

export class TeamMemberDto {
  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["update"] })
  addToHome?: boolean;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  fullname?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  designation?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  countryCode?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  @IsE164Phone({ message: "Phone number must be valid" })
  phoneNumber?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  facebook?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  twitter?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  linkedin?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsString({ groups: ["create", "update"] })
  instagram?: string;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
