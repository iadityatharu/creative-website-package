import { Request, Response } from "express";
import { Signin as SigninService } from "../../service/user/signin.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { accessMaxage } from "../../constant/tokenexpiry";
import { UserRole } from "../../constant/enum.constant";
// import { verifyCaptcha } from "../../utils/verifyCaptch";

export class Signin {
  private signinService: SigninService;

  constructor() {
    this.signinService = new SigninService();
  }

  async signin(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;

    // if (!recaptchaToken) throw new expressError(400, "Captcha required");

    // const isValidCaptcha = await verifyCaptcha(recaptchaToken);
    // if (!isValidCaptcha)
    //   throw new expressError(StatusCode.BAD_REQUEST, "Invalid recaptcha");
    if (!email || !password)
      throw new expressError(
        StatusCode.NOT_FOUND,
        "Auth Credentials Required!"
      );
    const response = await this.signinService.signin(res, email, password);

    if (response.status === StatusCode.NOT_FOUND)
      throw new expressError(response.status, "User not found please signup!");
    if (response.status !== StatusCode.OK)
      throw new expressError(response.status, "Invalid Credentials!");

    if (response.accessToken) {
      res.cookie("accessToken", response.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: accessMaxage,
      });
    }

    return res.status(StatusCode.OK).json({
      status: response.status,
      message: "Signin successful",
      id: response.id,
      role: response.role,
      isVerified: response.isVerified,
      name: response.name,
    });
  }
}
