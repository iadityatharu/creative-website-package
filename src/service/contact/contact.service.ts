import { BaseService } from "../base.service";
import { Contact as ContactEntity } from "../../entities/contact.entity";
import { IContact } from "../../dto/contact/contact.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";
import { EmailQueue } from "../../email/email.queue";
import { contactMailTemplate } from "../../mailtemplate/contactmail";
import { AppDataSource } from "../../configs/psqlDb.config";
import { User } from "../../entities/user.entity";
import { UserRole } from "../../constant/enum.constant";

export class Contact extends BaseService<ContactEntity> {
  private userRepo = AppDataSource.getRepository(User);

  constructor() {
    super(ContactEntity);
  }

  async createContact(data: IContact): Promise<{ status: number }> {
    const contact = this.repository.create(data);
    await this.repository.save(contact);

    const admins = await this.userRepo.find({
      where: {
        isDeleted: false,
        isVerified: true,
        role: In([UserRole.ADMIN, UserRole.SUDOADMIN]),
      },
      select: ["email"],
    });

    const recipients = admins.map((admin) => admin.email).filter(Boolean);

    if (recipients.length) {
      const subject = `New Contact Inquiry from ${contact.fullname}`;
      const html = contactMailTemplate({
        fullname: contact.fullname,
        email: contact.email,
        organization: contact.organization,
        phoneNo: contact.phoneNo,
        address: contact.address,
        purpose: contact.purpose,
        message: contact.message,
      });

      await EmailQueue.addBulkEmails(recipients, subject, html);
    }

    return { status: StatusCode.CREATED };
  }

  async getAllContacts(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("contact")
      .where("contact.isDeleted = false");

    if (search) {
      query.andWhere(
        "contact.fullname ILIKE :search OR contact.email ILIKE :search OR contact.organization ILIKE :search OR contact.phoneNo ILIKE :search",
        { search: `%${search}%` }
      );
    }

    query
      .orderBy("contact.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .select([
        "contact.id",
        "contact.fullname",
        "contact.email",
        "contact.organization",
        "contact.phoneNo",
        "contact.purpose",
        "contact.createdAt",
      ]);

    const [contacts, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        contacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContactById(
    id: string
  ): Promise<{ status: number; contact?: ContactEntity }> {
    const contact = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!contact) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, contact };
  }

  async deleteContact(
    ids: string[] | string
  ): Promise<{ status: number; deletedContactIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const contacts = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });
    if (!contacts.length)
      return { status: StatusCode.NOT_FOUND, deletedContactIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedContactIds: ids };
  }

  async hardDeleteContacts(
    ids: string[] | string
  ): Promise<{ status: number; deletedContactIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const contacts = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });
    if (!contacts.length)
      return { status: StatusCode.NOT_FOUND, deletedContactIds: [] };

    const contactIds = contacts.map((contact) => contact.id);

    await this.repository.delete({ id: In(contactIds) });

    return { status: StatusCode.OK, deletedContactIds: contactIds };
  }

  async recoverDeletedContacts(
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

  async getDeletedContacts(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("contact")
      .where("contact.isDeleted = true");

    if (search) {
      query.andWhere(
        "contact.fullname ILIKE :search OR contact.email ILIKE :search OR contact.organization ILIKE :search OR contact.phoneNo ILIKE :search",
        { search: `%${search}%` }
      );
    }

    const [contacts, total] = await query
      .orderBy("contact.updatedAt", "DESC")
      .skip(skip)
      .take(limit)
      .select([
        "contact.id",
        "contact.fullname",
        "contact.email",
        "contact.organization",
        "contact.phoneNo",
        "contact.purpose",
        "contact.createdAt",
      ])
      .getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        contacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
