import { BaseService } from "../base.service";
import { Inquiry as InquiryEntity } from "../../entities/inquiry.entity";
import { IInquiry } from "../../dto/inquiry/inquiry.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Product } from "../../entities/product.entity";
import { EmailQueue } from "../../email/email.queue";
import { inquiryMailTemplate } from "../../mailtemplate/inquirymail";
import { User } from "../../entities/user.entity";
import { UserRole } from "../../constant/enum.constant";

export class Inquiry extends BaseService<InquiryEntity> {
  private productRepo = AppDataSource.getRepository(Product);
  private userRepo = AppDataSource.getRepository(User);

  constructor() {
    super(InquiryEntity);
  }

  async createInquiry(data: IInquiry): Promise<{ status: number }> {
    const product = await this.productRepo.findOne({
      where: { id: data.productId, isDeleted: false },
    });
    if (!product) return { status: StatusCode.NOT_FOUND };

    const inquiry = this.repository.create({
      ...data,
      product,
    });

    await this.repository.save(inquiry);

    const users = await this.userRepo.find({
      where: { isDeleted: false, isVerified: true, role: UserRole.ADMIN },
      select: ["email"],
    });

    const recipients = users.map((u) => u.email).filter(Boolean);

    if (recipients.length > 0) {
      const subject = `New Inquiry from ${data.name} - ${product.name}`;
      const html = inquiryMailTemplate({
        ...data,
        productId: product.name,
      });

      await EmailQueue.addBulkEmails(recipients, subject, html);
    }

    return { status: StatusCode.CREATED };
  }

  async getAllInquiries(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("inquiry")
      .leftJoinAndSelect(
        "inquiry.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "inquiry.replies",
        "replies",
        "replies.isDeleted = false"
      )
      .where("inquiry.isDeleted = :isDeleted", { isDeleted: false });

    if (search) {
      query.andWhere(
        "(inquiry.name ILIKE :search OR inquiry.email ILIKE :search OR inquiry.phone ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [inquiries, total] = await query
      .orderBy("inquiry.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const result = inquiries.map((i) => ({
      ...i,
      product: i.product ? { id: i.product.id, name: i.product.name } : null,
   }));

    return {
      status: StatusCode.OK,
      data: {
        inquiries: result,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInquiryById(
    id: string
  ): Promise<{ status: number; inquiry?: InquiryEntity }> {
    const inquiry = await this.repository
      .createQueryBuilder("inquiry")
      .leftJoinAndSelect(
        "inquiry.product",
        "product",
        "product.isDeleted = false"
      )
      .leftJoinAndSelect(
        "inquiry.replies",
        "replies",
        "replies.isDeleted = false"
      )
      .where("inquiry.id = :id", { id })
      .andWhere("inquiry.isDeleted = false")
      .getOne();
    if (!inquiry) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, inquiry };
  }

  async getInquiriesForExport(
    search = "",
    page?: number,
    limit?: number,
    fields?: string[]
  ) {
    const query = this.repository
      .createQueryBuilder("inquiry")
      .leftJoinAndSelect(
        "inquiry.product",
        "product",
        "product.isDeleted = false"
      )
      .where("inquiry.isDeleted = :isDeleted", { isDeleted: false });

    if (search) {
      query.andWhere(
        "(inquiry.name ILIKE :search OR inquiry.email ILIKE :search OR inquiry.phone ILIKE :search)",
        { search: `%${search}%` } 
      );
    }

    const orderByQuery = query.orderBy("inquiry.createdAt", "DESC");

    if (
      page !== undefined &&
      limit !== undefined &&
      Number(page) > 0 &&
      Number(limit) > 0
    ) {
      const skip = (Number(page) - 1) * Number(limit);
      orderByQuery.skip(skip).take(Number(limit));
    }

    const inquiries = await orderByQuery.getMany();

    const defaultFields = [
      "name",
      "email",
      "phone",
      "address",
      "message",
      "product",
      "isHandled",
      "createdAt",
    ];

    const selectedFields =
      Array.isArray(fields) && fields.length
        ? fields.map((field) => field.trim()).filter(Boolean)
        : defaultFields;

    return inquiries.map((inquiry) => {
      const base = {
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        address: inquiry.address ?? "",
        message: inquiry.message ?? "",
        product: inquiry.product?.name ?? "-",
        isHandled: inquiry.isHandled,
        createdAt: inquiry.createdAt,
      };

      const filtered: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        if (field in base) {
          filtered[field] = (base as any)[field];
        }
      });
      return filtered;
    });
  }

  async updateInquiry(id: string, data: IInquiry): Promise<{ status: number }> {
    const inquiry = await this.repository.findOne({ where: { id } });
    if (!inquiry) return { status: StatusCode.NOT_FOUND };

    this.repository.merge(inquiry, data);
    await this.repository.save(inquiry);
    return { status: StatusCode.OK };
  }

  async deleteInquiry(
    ids: string[] | string
  ): Promise<{ status: number; deletedInquiryIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const inquiries = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });

    if (!inquiries.length)
      return { status: StatusCode.NOT_FOUND, deletedInquiryIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedInquiryIds: ids };
  }

  async hardDeleteInquiries(
    ids: string[] | string
  ): Promise<{ status: number; deletedInquiryIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const inquiries = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });

    if (!inquiries.length)
      return { status: StatusCode.NOT_FOUND, deletedInquiryIds: [] };

    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    await this.repository.delete({ id: In(inquiryIds) });

    return { status: StatusCode.OK, deletedInquiryIds: inquiryIds };
  }

  async recoverDeletedInquiries(
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

  async getDeletedInquiries(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("inquiry")
      .leftJoinAndSelect("inquiry.product", "product")
      .leftJoinAndSelect("inquiry.replies", "replies")
      .where("inquiry.isDeleted = :isDeleted", { isDeleted: true });

    if (search) {
      query.andWhere(
        "(inquiry.name ILIKE :search OR inquiry.email ILIKE :search OR inquiry.phone ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [inquiries, total] = await query
      .orderBy("inquiry.updatedAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const result = inquiries.map((i) => ({
      ...i,
      product: i.product ? { id: i.product.id, name: i.product.name } : null,
    }));

    return {
      status: StatusCode.OK,
      data: {
        inquiries: result,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
