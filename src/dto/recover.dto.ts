import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class RecoverDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  ids: string[];
}
