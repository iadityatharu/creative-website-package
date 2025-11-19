import { Request, Response } from "express";
import { AuthService } from "../../service/user/auth.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import {
  GenerateResetLinkDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "../../dto/user/auth.dto";
import { decodeToken } from "../../utils/decodeToken";
import { Message } from "../../constant/message.interface";

const authService = new AuthService();

export class Auth {
  async generateResetLink(req: Request, res: Response) {
    const body = req.body as GenerateResetLinkDto;
    if (!body.email)
      throw new expressError(StatusCode.BAD_REQUEST, "Email is required");

    const result = await authService.generateResetLink(body.email);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.OK, "User not found");

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Password reset link sent",
      resetLink: result.resetPassword,
    });
  }

  async resetPassword(req: Request, res: Response) {
    const body = req.body as ResetPasswordDto;
    const token = body.token;

    if (!token || !body.password || !body.confirmPassword)
      throw new expressError(StatusCode.BAD_REQUEST, "All fields are required");

    if (body.password !== body.confirmPassword)
      throw new expressError(StatusCode.BAD_REQUEST, "Passwords do not match");

    const { id } = decodeToken(token);

    const result = await authService.resetPassword(id, body.password);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.OK, "User not found");
    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(StatusCode.OK, "Password used in last 6 months");

    return res.status(StatusCode.ACCEPTED).json({
      status: StatusCode.ACCEPTED,
      message: "Password reset successfully",
    });
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    const body = req.body as ChangePasswordDto;
    const userId = req.user.id;

    if (!body.currentPassword || !body.password || !body.confirmPassword)
      throw new expressError(StatusCode.BAD_REQUEST, "All fields are required");

    if (body.password !== body.confirmPassword)
      throw new expressError(StatusCode.BAD_REQUEST, "Passwords do not match");

    const result = await authService.changePassword(
      userId,
      body.currentPassword,
      body.password
    );

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.OK, "User not found");
    if (result.status === StatusCode.UNAUTHORIZED)
      throw new expressError(StatusCode.OK, "Invalid current password");
    if (result.status === StatusCode.ALREADY_EXIST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Password used in last 6 months"
      );
    res.clearCookie("refreshToken", req.cookies?.refreshToken);
    res.clearCookie("accessToken", req.cookies?.accessToken);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Password changed successfully",
    });
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    const auth = req.user.auth;
    await authService.logout(auth);

    res.clearCookie("refreshToken", req.cookies?.accessToken);
    res.clearCookie("accessToken", req.cookies?.refreshToken);
    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: Message.SUCCESS,
    });
  }
}
