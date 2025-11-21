import { BaseService } from "../base.service";
import { Faq as FaqEntity } from "../../entities/faq.entity";
import { IFaq } from "../../dto/faq/faq.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";

export class Faq extends BaseService<FaqEntity> {
  constructor() {
    super(FaqEntity);
  }

  async createFaq(data: IFaq): Promise<{ status: number }> {
    const existing = await this.repository.findOne({
      where: { title: data.title, isDeleted: false },
    });
    if (existing) return { status: StatusCode.ALREADY_EXIST };

    const faq = this.repository.create(data);
    await this.repository.save(faq);
    return { status: StatusCode.CREATED };
  }

  async getAllFaqs(page = 1, limit = 10, search = "") {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("faq")
      .where("faq.isDeleted = false");

    if (search) {
      query.andWhere("faq.title ILIKE :search", { search: `%${search}%` });
    }

    query
      .orderBy("faq.sortOrder", "ASC")
      .addOrderBy("faq.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [faqs, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: { faqs, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFaqById(id: string) {
    const faq = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!faq) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, faq };
  }

  async updateFaq(id: string, data: IFaq) {
    const faq = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!faq) return { status: StatusCode.NOT_FOUND };
    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      faq.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: faq.id,
      });
    }
    this.repository.merge(faq, data);
    await this.repository.save(faq);
    return { status: StatusCode.OK };
  }

  async deleteFaq(ids: string[] | string) {
    if (!Array.isArray(ids)) ids = [ids];

    const faqs = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });
    if (!faqs.length)
      return { status: StatusCode.NOT_FOUND, deletedFaqIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedFaqIds: ids };
  }

  async hardDeleteFaqs(
    ids: string[] | string
  ): Promise<{ status: number; deletedFaqIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const faqs = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });

    if (!faqs.length)
      return { status: StatusCode.NOT_FOUND, deletedFaqIds: [] };

    const faqIds = faqs.map((faq) => faq.id);
    await this.repository.delete({ id: In(faqIds) });
    return { status: StatusCode.OK, deletedFaqIds: faqIds };
  }

  async recoverDeletedFaqs(
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

  async getDeletedFaqs(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("faq")
      .where("faq.isDeleted = true");

    if (search) {
      query.andWhere("faq.title ILIKE :search", { search: `%${search}%` });
    }

    query.orderBy("faq.updatedAt", "DESC").skip(skip).take(limit);

    const [faqs, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: { faqs, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
