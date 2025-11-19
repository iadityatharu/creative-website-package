import { User } from "../../entities/user.entity";
import { Auth } from "../../entities/auth.entity";
import { BaseService } from "../base.service";
import bcrypt from "bcryptjs";
import { generateResetToken } from "../../utils/generateResetLink";
import { StatusCode } from "../../constant/statusCode.interface";
import { addMonths } from "date-fns";
import { EmailQueue } from "../../email/email.queue";
import { resetPasswordMailTemplate } from "../../mailtemplate/resetPasswordmail";

export class AuthService extends BaseService<User> {
  constructor() {
    super(User);
  }

  async generateResetLink(email: string) {
    const user = await this.repository.findOne({
      where: { email },
      relations: ["auth"],
    });

    if (!user || !user.auth)
      return { status: StatusCode.NOT_FOUND, data: "", resetPassword: "" };

    const { hashedToken, jwtToken } = await generateResetToken(user.id);

    user.auth.resetPasswordToken = hashedToken;
    user.auth.resetPasswordExpires = new Date(Date.now() + 300000);
    await this.repository.save(user);

    const resetLink = `${process.env.DASHBOARD_URL}/reset-password?token=${hashedToken}&resetToken=${jwtToken}`;

    const emailHtml = resetPasswordMailTemplate({
      name: `${user.firstname} ${user.lastname}`.trim(),
      resetLink,
    });
    await EmailQueue.addEmail(
      user.email,
      "Reset Your Password - Plaza Sales",
      emailHtml
    );
    return { status: StatusCode.OK, data: resetLink, resetPassword: jwtToken };
  }

  async resetPassword(id: string, password: string) {
    const user = await this.repository.findOne({
      where: { id },
      relations: ["auth"],
    });

    if (!user || !user.auth) return { status: StatusCode.NOT_FOUND };

    const auth = user.auth;
    auth.passwordHistory = auth.passwordHistory || [];

    const sixMonthsAgo = addMonths(new Date(), -6);

    const shouldBlockReuse = async (plain: string) => {
      for (const old of auth.passwordHistory ?? []) {
        const createdAt = new Date(old.createdAt as any);
        if (Number.isNaN(createdAt.getTime())) continue;
        if (createdAt >= sixMonthsAgo) {
          const match = await bcrypt.compare(plain, old.passwordHash);
          if (match) return true;
        }
      }
      return false;
    };

    if (await shouldBlockReuse(password)) {
      return { status: StatusCode.ALREADY_EXIST };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    auth.passwordHistory = (auth.passwordHistory || []).filter((entry) => {
      const createdAt = new Date(entry.createdAt as any);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= sixMonthsAgo;
    });
    auth.passwordHistory.push({
      passwordHash: hashedPassword,
      createdAt: new Date(),
    });

    if (auth.passwordHistory.length > 5) auth.passwordHistory.shift();

    auth.passwordHash = hashedPassword;
    auth.resetPasswordToken = null;
    auth.resetPasswordExpires = null;
    await this.repository.save(user);

    return { status: StatusCode.ACCEPTED };
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.repository.findOne({
      where: { id },
      relations: ["auth"],
    });

    if (!user || !user.auth) return { status: StatusCode.NOT_FOUND };

    const auth = user.auth;
    const valid = await bcrypt.compare(currentPassword, auth.passwordHash);
    if (!valid) return { status: StatusCode.UNAUTHORIZED };

    auth.passwordHistory = auth.passwordHistory || [];
    const sixMonthsAgo = addMonths(new Date(), -6);

    const shouldBlockReuse = async (plain: string) => {
      for (const old of auth.passwordHistory ?? []) {
        const createdAt = new Date(old.createdAt as any);
        if (Number.isNaN(createdAt.getTime())) continue;
        if (createdAt >= sixMonthsAgo) {
          const match = await bcrypt.compare(plain, old.passwordHash);
          if (match) return true;
        }
      }
      return false;
    };

    if (await shouldBlockReuse(newPassword)) {
      return { status: StatusCode.ALREADY_EXIST };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    auth.passwordHistory = (auth.passwordHistory || []).filter((entry) => {
      const createdAt = new Date(entry.createdAt as any);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= sixMonthsAgo;
    });
    auth.passwordHistory.push({
      passwordHash: hashedPassword,
      createdAt: new Date(),
    });
    if (auth.passwordHistory.length > 5) auth.passwordHistory.shift();

    auth.passwordHash = hashedPassword;

    await this.repository.save(user);

    return { status: StatusCode.OK };
  }

  async logout(auth: Auth) {
    if (!auth) return { status: StatusCode.NOT_FOUND };
    auth.refreshToken = null;
    await this.repository.save(auth.user);

    return { status: StatusCode.OK };
  }
}
