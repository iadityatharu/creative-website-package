import { BaseService } from "../base.service";
import { Career as CareerEntity } from "../../entities/career.entity";
import { ICareer } from "../../dto/career/career.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";
import { isUUID } from "class-validator";

export class Career extends BaseService<CareerEntity> {
  constructor() {
    super(CareerEntity);
  }

  async createCareer(data: ICareer): Promise<{ status: number }> {
    if (data.slug) {
      const existingSlug = await this.repository.findOne({
        where: { slug: data.slug },
      });
      if (existingSlug) return { status: StatusCode.ALREADY_EXIST };
    }

    const career = this.repository.create(data);
    await this.repository.save(career);
    return { status: StatusCode.CREATED };
  }

  async getAllCareers(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("career")
      .select([
        "career.id",
        "career.title",
        "career.location",
        "career.jobType",
        "career.salaryRange",
        "career.slug",
      ])
      .where("career.isDeleted = false");

    if (search) {
      query.andWhere(
        "career.title ILIKE :search OR career.department ILIKE :search OR career.location ILIKE :search",
        { search: `%${search}%` }
      );
    }

    query
      .orderBy("career.sortOrder", "ASC")
      .addOrderBy("career.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [careers, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        careers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCareerByIdentifier(
    identifier: string
  ): Promise<{ status: number; career?: CareerEntity }> {
    let career: CareerEntity | null = null;

    if (isUUID(identifier)) {
      career = await this.repository.findOne({
        where: { id: identifier, isDeleted: false },
      });
    } else {
      career = await this.repository.findOne({
        where: { slug: identifier, isDeleted: false },
      });
    }

    if (!career) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, career };
  }

  async updateCareer(id: string, data: ICareer) {
    const career = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!career) return { status: StatusCode.NOT_FOUND };

    if (data.slug && data.slug !== career.slug) {
      const slugConflict = await this.repository.findOne({
        where: { slug: data.slug },
      });
      if (slugConflict && slugConflict.id !== career.id)
        return { status: StatusCode.ALREADY_EXIST };
    }
    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      career.sortOrder = await this.resolveSortOrder(data.sortOrder, {
        excludeId: career.id,
      });
    }
    this.repository.merge(career, data);
    await this.repository.save(career);

    return { status: StatusCode.OK };
  }

  async deleteCareer(ids: string[] | string) {
    if (!Array.isArray(ids)) ids = [ids];

    const careers = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });
    if (!careers.length)
      return { status: StatusCode.NOT_FOUND, deletedCareerIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedCareerIds: ids };
  }

  async hardDeleteCareers(
    ids: string[] | string
  ): Promise<{ status: number; deletedCareerIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length)
      return { status: StatusCode.BAD_REQUEST, deletedCareerIds: [] };

    const careers = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });

    if (!careers.length)
      return { status: StatusCode.NOT_FOUND, deletedCareerIds: [] };

    const careerIds = careers.map((career) => career.id);
    await this.repository.delete({ id: In(careerIds) });

    return { status: StatusCode.OK, deletedCareerIds: careerIds };
  }

  async recoverDeletedCareers(
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

  async getDeletedCareers(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("career")
      .select([
        "career.id",
        "career.title",
        "career.location",
        "career.jobType",
        "career.salaryRange",
        "career.slug",
      ])
      .where("career.isDeleted = true");

    if (search) {
      query.andWhere(
        "career.title ILIKE :search OR career.department ILIKE :search OR career.location ILIKE :search",
        { search: `%${search}%` }
      );
    }

    query.orderBy("career.updatedAt", "DESC").skip(skip).take(limit);

    const [careers, total] = await query.getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        careers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
