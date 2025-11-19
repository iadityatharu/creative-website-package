import { BaseService } from "../base.service";
import { User } from "../../entities/user.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import { UserRole } from "../../constant/enum.constant";
import bcrypt from "bcryptjs";
import { Token } from "../../functions/token";
import { SigninResult } from "../../constant/interface.constant";
import { refreshMaxage } from "../../constant/tokenexpiry";
import { Auth } from "../../entities/auth.entity";

export class Signin extends BaseService<User> {
  constructor() {
    super(User);
  }

  async signin(
    res: any,
    email: string,
    password: string
  ): Promise<SigninResult> {
    if (!email || !password) {
      return {
        status: StatusCode.BAD_REQUEST,
        id: null,
        role: null,
        isVerified: null,
        accessToken: null,
        name: null,
      };
    }
    const user = await User.createQueryBuilder("user")
      .leftJoinAndSelect("user.auth", "auth")
      .select([
        "user.id",
        "user.firstname",
        "user.middlename",
        "user.lastname",
        "user.email",
        "user.role",
        "user.isVerified",
        "auth.passwordHash",
        "auth.refreshToken",
      ])
      .where("user.email = :email", { email })
      .andWhere("user.isDeleted = :isDeleted", { isDeleted: false })
      .getOne();

    if (user === null) {
      return {
        status: StatusCode.NOT_FOUND,
        id: null,
        role: null,
        isVerified: null,
        accessToken: null,
        name: null,
      };
    }
    const isValidPassword = await bcrypt.compare(
      password,
      user.auth.passwordHash || ""
    );

    if (!isValidPassword) {
      return {
        status: StatusCode.UNAUTHORIZED,
        id: null,
        role: null,
        isVerified: null,
        accessToken: null,
        name: null,
      };
    }
    const authClaims = {
      id: user.id,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      name: [user.firstname, user.middlename, user.lastname]
        .filter(Boolean)
        .join(" "),
    };

    const refreshClaims = { id: user.id };

    const accessTokenService = new Token(
      process.env.ACCESS_TOKEN_SECRET,
      process.env.ACCESS_TOKEN_EXPIRES_IN
    );
    const refreshTokenService = new Token(
      process.env.REFRESH_TOKEN_SECRET,
      process.env.REFRESH_TOKEN_EXPIRES_IN
    );

    const accessToken = accessTokenService.generateToken(authClaims);
    const refreshToken = refreshTokenService.generateToken(refreshClaims);

    user.auth.refreshToken = refreshToken;
    await Auth.getRepository().save(user.auth);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: refreshMaxage,
    });

    return {
      status: StatusCode.OK,
      id: user.id,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      accessToken,
      name: [user.firstname, user.middlename, user.lastname]
        .filter(Boolean)
        .join(" "),
    };
  }
}
