import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Request, Response, NextFunction } from "express";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";

function sanitizeKeys(obj: any): any {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const trimmedKey = key.trim();
      sanitized[trimmedKey] =
        typeof value === "string" ? value.trim() : sanitizeKeys(value);
    }
    return sanitized;
  }
  return obj;
}

export function validateRequest(
  dtoClass: any,
  source: "body" | "query" | "params" = "body",
  validationGroup?: "create" | "update"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawData = req[source];

      if (
        rawData === undefined ||
        rawData === null ||
        typeof rawData !== "object" ||
        Array.isArray(rawData) ||
        Object.keys(rawData).length === 0
      ) {
        return next(
          new expressError(
            StatusCode.BAD_REQUEST,
            "No data received; operation cannot be performed."
          )
        );
      }

      let dataToValidate = sanitizeKeys(rawData);
      const dtoObject = plainToInstance(dtoClass, dataToValidate, {
        enableImplicitConversion: true,
      });

      const errors: ValidationError[] = await validate(dtoObject, {
        whitelist: true,
        forbidNonWhitelisted: true,
        groups: validationGroup ? [validationGroup] : undefined,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((err) => {
          const constraints = err.constraints || {};
          let messages = Object.entries(constraints).map(
            ([constraintKey, message]) => {
              if (constraintKey === "whitelistValidation") {
                return `Unexpected field "${err.property}". Remove it or ensure it is declared in the DTO.`;
              }
              return message;
            }
          );

          if (!messages.length) {
            messages = ["Invalid or missing value."];
          }

          return {
            field: err.property,
            messages,
          };
        });

        return next(
          new expressError(
            StatusCode.BAD_REQUEST,
            JSON.stringify(formattedErrors)
          )
        );
      }

      req[source] = dtoObject;
      next();
    } catch (err) {
      next(err);
    }
  };
}
