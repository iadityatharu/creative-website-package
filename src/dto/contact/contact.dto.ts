import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
} from "class-validator";
import { ContactPurpose } from "../../constant/enum.constant";
import { IsE164Phone } from "../../decorator/isE164Phone.decorator";

export class ContactDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  fullname: string;

  @IsEmail({}, { groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  email: string;

  @IsString({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  organization?: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  @IsE164Phone({ message: "Phone number must be valid" })
  phoneNo: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  address: string;

  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  message: string;

  @IsEnum(ContactPurpose, { groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  purpose: ContactPurpose;

  @IsOptional({ groups: ["create", "update"] })
  @IsNumber({}, { groups: ["create", "update"] })
  sortOrder?: number;
}
