import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCode } from "../constant/statusCode.interface";
import { accessMaxage } from "../constant/tokenexpiry";
import { User } from "../entities/user.entity";
import { UserRole } from "../constant/enum.constant";
import { expressError } from "../utils/expressError";

interface AuthRequest extends Request {
  user?: JwtPayload | any;
}

export const authentication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;
  const accessSecret = process.env.ACCESS_TOKEN_SECRET!;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET!;

  if (!accessToken && !refreshToken) {
    return next(new expressError(StatusCode.BAD_REQUEST, "Please login"));
  }

  try {
    if (accessToken) {
      req.user = jwt.verify(accessToken, accessSecret);
      return next();
    }

    if (!refreshToken) {
      return next(new expressError(StatusCode.UNAUTHORIZED, "Please login"));
    }

    jwt.verify(refreshToken, refreshSecret, async (err, refPayload) => {
      if (err || !refPayload || typeof refPayload === "string") {
        return next(
          new expressError(
            StatusCode.UNAUTHORIZED,
            "Session expired, please login"
          )
        );
      }

      try {
        const payload = refPayload as any;

        const user = await User.findOne({
          where: { id: payload.id },
        });
        if (!user) {
          return next(new expressError(StatusCode.NOT_FOUND, "User not found"));
        }

        const authClaims = {
          id: user.id,
          role: user.role as UserRole,
          isVerified: user.isVerified,
          name: [user.firstname, user.middlename, user.lastname]
            .filter(Boolean)
            .join(" "),
        };

        const expiresIn =
          (process.env.ACCESS_TOKEN_EXPIRES_IN as `${number}${
            | "s"
            | "m"
            | "h"
            | "d"}`) || "30m";

        const newAccessToken = jwt.sign(authClaims, accessSecret, {
          expiresIn,
        });

        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: accessMaxage,
        });

        req.user = authClaims;
        next();
      } catch (e: any) {
        next(
          new expressError(
            StatusCode.UNAUTHORIZED,
            e.message || "Session expired"
          )
        );
      }
    });
  } catch (error: any) {
    next(
      new expressError(
        StatusCode.BAD_REQUEST,
        error.message || "Authentication failed"
      )
    );
  }
};
