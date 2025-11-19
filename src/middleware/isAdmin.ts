import { NextFunction } from "express";
import { AuthenticatedRequest } from "../constant/authRequest";
import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/interface.constant";
import { expressError } from "../utils/expressError";
import { UserRole } from "../constant/enum.constant";

export const isAdmin = (req: AuthenticatedRequest, _, next: NextFunction) => {
  try {
    const role = req.user.role;
    if (role !== UserRole.ADMIN) {
      throw new expressError(
        StatusCode.UNAUTHORIZED,
        `${Message.UNAUTHORIZED} to access resource`
      );
    }
    next();
  } catch (error) {
    throw new expressError(StatusCode.BAD_REQUEST, error.message);
  }
};
