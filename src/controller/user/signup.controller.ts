import { Response } from "express";
import { Signup as SignupService } from "../../service/user/signup.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { FileUploadMap } from "../../types/fileUploadtypes";
import { MediaMap } from "../../functions/mediaMap";
import { Gender } from "../../constant/enum.constant";

export class Signup {
  private signupService = new SignupService();
  private mediaMap = new MediaMap();

  async signup(
    req: AuthenticatedRequest & {
      body: {
        firstname: string;
        middlename?: string;
        lastname: string;
        email: string;
        phone: string;
        password: string;
        address: string;
        gender?: Gender;
        profilePicture: string;
      };
      fileUrls?: FileUploadMap;
    },
    res: Response
  ) {
    const fileUrls = req.fileUrls;
    const mappedFiles = this.mediaMap?.mapAll(fileUrls);
    const profile = mappedFiles?.profile;
    let profilePicture: string | undefined;

    if (profile) {
      profilePicture = Array.isArray(profile)
        ? profile[0]?.fileUrl
        : profile.fileUrl;
    }
    const {
      firstname,
      middlename,
      lastname,
      email,
      phone,
      password,
      address,
      gender,
    } = req.body;

    if (!firstname || !lastname || !address || !password) {
      throw new expressError(StatusCode.BAD_REQUEST, "Required fields missing");
    }

    const result = await this.signupService.signup(
      {
        firstname,
        middlename,
        lastname,
        email,
        phone,
        password,
        address,
        profilePicture,
        gender,
      },
      res
    );

    if (result.status !== StatusCode.CREATED) {
      throw new expressError(StatusCode.ALREADY_EXIST, "User already exists");
    }

    return res.status(StatusCode.CREATED).json({
      message: "Signup successful",
      status: result.status,
    });
  }
}
