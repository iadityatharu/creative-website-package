import { BaseService } from "../base.service";
import { User } from "../../entities/user.entity";
import { Auth } from "../../entities/auth.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import bcrypt from "bcryptjs";
import { SignupData } from "../../constant/interface.constant";
import { UserRole } from "../../constant/enum.constant";
import { accessMaxage, refreshMaxage } from "../../constant/tokenexpiry";
import { Token } from "../../functions/token";

export class Signup extends BaseService<User> {
  constructor() {
    super(User);
  }

  async signup(data: SignupData, res: any): Promise<{ status: number }> {
    const existingUser = await User.findOne({
      where: [{ email: data.email || null }, { phone: data.phone || null }],
      relations: ["auth"],
    });

    if (existingUser) return { status: StatusCode.ALREADY_EXIST };

    if (!data.password && !data.oauthProvider) {
      return { status: StatusCode.BAD_REQUEST };
    }
    const user = this.repository.create({
      firstname: data.firstname,
      middlename: data.middlename,
      lastname: data.lastname,
      address: data.address,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      profilePicture: data.profilePicture || null,
      isVerified: true,
      role: UserRole.SUDOADMIN,
    });

    const auth = new Auth();
    if (data.password) {
      auth.passwordHash = await bcrypt.hash(data.password, 12);
    }
    user.auth = auth;

    await this.repository.save(user);

    await this.generateTokens(user, auth, res);

    return { status: StatusCode.CREATED };
  }

  private async generateTokens(user: User, auth: Auth, res: any) {
    const authClaims = {
      id: user.id,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      name: [user.firstname, user.middlename, user.lastname]
        .filter(Boolean)
        .join(" "),
    };

    const refreshClaims = {
      id: user.id,
    };

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

    auth.refreshToken = refreshToken;
    await Auth.getRepository().save(auth);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: accessMaxage,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: refreshMaxage,
    });

    return { accessToken, refreshToken };
  }
}
