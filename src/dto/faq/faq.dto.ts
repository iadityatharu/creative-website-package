import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class FaqDto {
  @IsString({ groups: ["create", "update"] })
  @IsNotEmpty({ groups: ["create"] })
  @IsOptional({ groups: ["update"] })
  title: string;

  @IsOptional({ groups: ["create", "update"] })
  description?: string | Record<string, unknown>;

  @IsBoolean({ groups: ["create", "update"] })
  @IsOptional({ groups: ["create", "update"] })
  isActive?: boolean;
}
