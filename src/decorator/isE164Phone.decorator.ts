import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from "class-validator";
import { PhoneUtil } from "../utils/phoneUtil";

@ValidatorConstraint({ async: false })
export class IsE164PhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: any, args: ValidationArguments): boolean {
    if (!phone || typeof phone !== "string") return false;
    return PhoneUtil.isValidPhone(phone);
  }

  defaultMessage(args: ValidationArguments): string {
    return "Phone number must be a valid phone number in E.164 format (e.g., +9779812345678)";
  }
}

export function IsE164Phone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsE164PhoneConstraint,
    });
  };
}
