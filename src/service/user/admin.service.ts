import { User } from "../../entities/user.entity";
import { BaseService } from "../base.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { Like, In } from "typeorm";
import { UserRole } from "../../constant/enum.constant";
import { deleteMedia } from "../../functions/deleteMedia";
import { Auth } from "../../entities/auth.entity";
import { SignupData } from "../../constant/interface.constant";
import bcrypt from "bcryptjs";
import { EmailQueue } from "../../email/email.queue";
import { userCreatedMailTemplate } from "../../mailtemplate/usercreatewelcomemail";

export class Admin extends BaseService<User> {
  constructor() {
    super(User);
  }

  async createUsers(
    data: SignupData,
    createdBy: string,
    profilePicture?: string
  ): Promise<{ status: number }> {
    const existingUser = await this.repository.findOne({
      where: [{ email: data.email }, { phone: data.phone }],
    });

    if (existingUser) return { status: StatusCode.ALREADY_EXIST };

    const user = this.repository.create({
      ...data,
      role: data.role || UserRole.ADMIN,
      isVerified: false,
      createdBy,
      profilePicture: profilePicture || null,
    });

    const auth = new Auth();
    if (data.password) {
      auth.passwordHash = await bcrypt.hash(data.password, 12);
    }
    user.auth = auth;

    await this.repository.save(user);

    try {
      if (user.email) {
        const subject = `Welcome to Plaza Sales Your Account Details`;

        const html = userCreatedMailTemplate({
          name: `${user.firstname || ""}${user.middlename || ""} ${
            user.lastname || ""
          }`.trim(),
          email: user.email,
          username: user.email,
          password: data.password || "TemporaryPassword123",
        });

        await EmailQueue.addEmail(user.email, subject, html);
      }
    } catch (err) {}

    return { status: StatusCode.CREATED };
  }

  async updateUsers(
    id: string,
    data: Partial<User>
  ): Promise<{ status: number }> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) return { status: StatusCode.NOT_FOUND };

    let oldProfileUrl: string | undefined;
    if (
      data.profilePicture &&
      user.profilePicture &&
      user.profilePicture !== data.profilePicture
    )
      oldProfileUrl = user.profilePicture;

    Object.assign(user, data);
    await this.repository.save(user);

    if (oldProfileUrl)
      deleteMedia({ urls: [oldProfileUrl] }).catch(console.error);

    return { status: StatusCode.OK };
  }

  async deleteUsers(
    ids: string[] | string
  ): Promise<{ status: number; deletedUserIds?: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const users = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id", "profilePicture"],
    });

    if (!users.length) {
      return { status: StatusCode.NOT_FOUND };
    }
    const foundIds = users.map((u) => u.id);

    const profileUrls = users
      .map((u) => u.profilePicture)
      .filter((url): url is string => Boolean(url));

    await this.repository.delete({ id: In(foundIds) });

    if (profileUrls.length) {
      deleteMedia({ urls: profileUrls }).catch(console.error);
    }

    return {
      status: StatusCode.OK,
      deletedUserIds: foundIds,
    };
  }
  async getUsersById(id: string): Promise<{ status: number; data?: User }> {
    const user = await this.repository.findOne({
      where: { id },
    });
    if (!user) return { status: StatusCode.NOT_FOUND };

    return { status: StatusCode.OK, data: user };
  }

  async getAllUsers(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: Object }> {
    const skip = (page - 1) * limit;
    const where = search
      ? [
          { email: Like(`%${search}%`), isDeleted: false },
          { phone: Like(`%${search}%`), isDeleted: false },
        ]
      : { isDeleted: false };

    const [users, total] = await this.repository.findAndCount({
      where,
      order: { sortOrder: "ASC" },
      skip,
      take: limit,
    });

    return {
      status: StatusCode.OK,
      data: {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
