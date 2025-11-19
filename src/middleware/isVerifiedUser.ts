import { Request, Response, NextFunction } from "express";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";

interface AuthRequest extends Request {
  user?: any;
}
export const isVerifiedUser = (
  req: AuthRequest,
  _: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return next(
      new expressError(
        StatusCode.UNAUTHORIZED,
        "Authentication token is missing or expired"
      )
    );
  }

  if (user.isVerified === false) {
    return next(
      new expressError(StatusCode.FORBIDDEN, "Account is not verified")
    );
  }
  next();
};
