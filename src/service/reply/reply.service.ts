import { BaseService } from "../base.service";
import { Reply } from "../../entities/reply.entity";
import { IReply } from "../../dto/reply/reply.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Inquiry } from "../../entities/inquiry.entity";
import { Application } from "../../entities/application.entity";
import { User } from "../../entities/user.entity";
import { EmailQueue } from "../../email/email.queue";
import { getIO } from "../../configs/socket.config";
import { In } from "typeorm";
import { inquiryReplyMailTemplate } from "../../mailtemplate/inquiryReplymail";
import { applicationMailTemplate } from "../../mailtemplate/careerReplymail";
import { Contact } from "../../entities/contact.entity";
import { contactReplyMailTemplate } from "../../mailtemplate/contactReplymail";

export class ReplyService extends BaseService<Reply> {
  private inquiryRepo = AppDataSource.getRepository(Inquiry);
  private applicationRepo = AppDataSource.getRepository(Application);
  private userRepo = AppDataSource.getRepository(User);
  private contactRepo = AppDataSource.getRepository(Contact);

  constructor() {
    super(Reply);
  }

  async createReply(data: IReply): Promise<{ status: number }> {
    const reply = this.repository.create({ ...data });
    let repliedBy = "";

    if (data.repliedById) {
      const adminUser = await this.userRepo.findOne({
        where: { id: data.repliedById },
      });
      if (adminUser) {
        repliedBy = [
          adminUser.firstname,
          adminUser.middlename,
          adminUser.lastname,
        ]
          .filter(Boolean)
          .join(" ");
        reply.repliedBy = adminUser;
      }
    }

    if (data.inquiryId) {
      const inquiry = await this.inquiryRepo.findOne({
        where: { id: data.inquiryId },
        relations: ["product"],
      });
      if (!inquiry) return { status: StatusCode.NOT_FOUND };

      reply.inquiry = inquiry;
      inquiry.isHandled = true;
      await this.inquiryRepo.save(inquiry);

      getIO().emit("inquiry-updated", {
        inquiryId: inquiry.id,
        isHandled: true,
      });

      if (inquiry.email) {
        const subject = `Reply from Plaza Sales regarding ${
          inquiry.product?.name || "Product"
        }`;
        const html = inquiryReplyMailTemplate({
          name: inquiry.name,
          productId: inquiry.product?.name || "",
          message: data.message,
          repliedBy: repliedBy,
        });
        await EmailQueue.addEmail(inquiry.email, subject, html);
      }
    }

    if (data.jobApplicationId) {
      const application = await this.applicationRepo.findOne({
        where: { id: data.jobApplicationId },
        relations: ["career"],
      });
      if (!application) return { status: StatusCode.NOT_FOUND };

      reply.jobApplication = application;

      application.isView = true;
      await this.applicationRepo.save(application);

      getIO().emit("application-viewed", {
        applicationId: application.id,
        isView: true,
      });

      if (application.email) {
        const subject = `Reply regarding your job application at Plaza Sales`;
        const html = applicationMailTemplate(
          application.name,
          data.message || ""
        );
        await EmailQueue.addEmail(application.email, subject, html);
      }
    }
    if (data.contactId) {
      const contact = await this.contactRepo.findOne({
        where: { id: data.contactId },
      });
      if (!contact) return { status: StatusCode.NOT_FOUND };

      contact.isView = true;
      await this.contactRepo.save(contact);

      reply.contact = contact;

      getIO().emit("contact-viewed", {
        contactId: contact.id,
        isView: true,
      });

      if (contact.email) {
        const subject = `Reply from Plaza Sales regarding your contact inquiry`;
        const html = contactReplyMailTemplate({
          name: contact.fullname,
          purpose: contact.purpose,
          message: data.message,
          repliedBy,
        });
        await EmailQueue.addEmail(contact.email, subject, html);
      }
    }

    await this.repository.save(reply);
    return { status: StatusCode.CREATED };
  }

  async getAllReplies(page = 1, limit = 10, search = "") {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("reply")
      .leftJoinAndSelect(
        "reply.inquiry",
        "inquiry",
        "inquiry.isDeleted = false"
      )
      .leftJoinAndSelect(
        "reply.jobApplication",
        "application",
        "application.isDeleted = false"
      )
      .leftJoinAndSelect("reply.repliedBy", "user")
      .select([
        "reply.id",
        "reply.message",
        "reply.createdAt",
        "reply.updatedAt",
        "inquiry.id",
        "inquiry.name",
        "inquiry.email",
        "application.id",
        "application.name",
        "application.email",
        "user.id",
        "user.firstname",
        "user.middlename",
        "user.lastname",
      ])
      .where("reply.isDeleted = false")
      .orderBy("reply.createdAt", "DESC")
      .skip(skip)
      .take(limit);
    if (search) {
      query.andWhere(
        "(reply.message ILIKE :search OR inquiry.name ILIKE :search OR inquiry.email ILIKE :search OR application.name ILIKE :search OR application.email ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [replies, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        replies,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReplyById(id: string): Promise<{ status: number; reply?: Reply }> {
    const reply = await this.repository
      .createQueryBuilder("reply")
      .leftJoinAndSelect(
        "reply.inquiry",
        "inquiry",
        "inquiry.isDeleted = false"
      )
      .leftJoinAndSelect(
        "reply.jobApplication",
        "application",
        "application.isDeleted = false"
      )
      .leftJoinAndSelect("reply.repliedBy", "user")
      .where("reply.id = :id", { id })
      .andWhere("reply.isDeleted = false")
      .getOne();
    if (!reply) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, reply };
  }

  async updateReply(id: string, data: IReply): Promise<{ status: number }> {
    const reply = await this.repository.findOne({ where: { id } });
    if (!reply) return { status: StatusCode.NOT_FOUND };

    this.repository.merge(reply, data);
    await this.repository.save(reply);
    return { status: StatusCode.OK };
  }

  async deleteReply(
    ids: string[] | string
  ): Promise<{ status: number; deletedReplyIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const replies = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });
    if (!replies.length)
      return { status: StatusCode.NOT_FOUND, deletedReplyIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedReplyIds: ids };
  }

  async hardDeleteReplies(
    ids: string[] | string
  ): Promise<{ status: number; deletedReplyIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const replies = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });
    if (!replies.length)
      return { status: StatusCode.NOT_FOUND, deletedReplyIds: [] };

    const replyIds = replies.map((reply) => reply.id);
    await this.repository.delete({ id: In(replyIds) });
    return { status: StatusCode.OK, deletedReplyIds: replyIds };
  }

  async recoverDeletedReplies(
    ids: string[] | string
  ): Promise<{ status: number; recoveredCount: number }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length)
      return { status: StatusCode.BAD_REQUEST, recoveredCount: 0 };

    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: false })
      .where("id IN (:...ids)", { ids: idList })
      .andWhere("isDeleted = true")
      .execute();

    return { status: StatusCode.OK, recoveredCount: result.affected || 0 };
  }

  async getDeletedReplies(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("reply")
      .leftJoin("reply.inquiry", "inquiry")
      .leftJoin("reply.jobApplication", "application")
      .leftJoin("reply.repliedBy", "user")
      .select([
        "reply.id",
        "reply.message",
        "reply.createdAt",
        "reply.updatedAt",
        "inquiry.id",
        "inquiry.name",
        "inquiry.email",
        "application.id",
        "application.name",
        "application.email",
        "user.id",
        "user.firstname",
        "user.middlename",
        "user.lastname",
      ])
      .where("reply.isDeleted = :isDeleted", { isDeleted: true })
      .orderBy("reply.updatedAt", "DESC")
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        "(reply.message ILIKE :search OR inquiry.name ILIKE :search OR inquiry.email ILIKE :search OR application.name ILIKE :search OR application.email ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [replies, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        replies,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
