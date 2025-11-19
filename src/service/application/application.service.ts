import { BaseService } from "../base.service";
import { Application as ApplicationEntity } from "../../entities/application.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import { IApplication } from "../../dto/application/application.interface";
import { Like } from "typeorm";
import { deleteMedia } from "../../functions/deleteMedia";
import { In } from "typeorm";
import { EmailQueue } from "../../email/email.queue";
import { applicationGreetingTemplate } from "../../mailtemplate/applicationGreeting";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Career } from "../../entities/career.entity";

export class Application extends BaseService<ApplicationEntity> {
  private careerRepo = AppDataSource.getRepository(Career);

  constructor() {
    super(ApplicationEntity);
  }
  async createApplication(data: IApplication): Promise<{ status: number }> {
    let career: any;
    if (data.careerId) {
      career = await this.careerRepo.findOne({
        where: { id: data.careerId, isDeleted: false },
      });
      if (!career) return { status: StatusCode.NOT_FOUND };
    }

    const application = this.repository.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      resumeUrl: data.resumeUrl,
      coverLetterUrl: data.coverLetterUrl,
      status: data.status,
      position: data.position,
      career: career ?? undefined,
    });

    await this.repository.save(application);

    const subject = "Thank you for applying to Plaza Sales!";
    const html = applicationGreetingTemplate(data.name || "Applicant");

    await EmailQueue.addEmail(data.email, subject, html);

    return { status: StatusCode.CREATED };
  }

  async getAllApplications(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("application")
      .leftJoinAndSelect(
        "application.career",
        "career",
        "career.isDeleted = false"
      )
      .leftJoinAndSelect(
        "application.replies",
        "replies",
        "replies.isDeleted = false"
      )
      .where("application.isDeleted = :isDeleted", { isDeleted: false });

    if (search) {
      query.andWhere(
        "(application.name ILIKE :search OR application.email ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [applications, total] = await query
      .orderBy("application.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      status: StatusCode.OK,
      data: {
        applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplicationById(
    id: string
  ): Promise<{ status: number; data?: any }> {
    const application = await this.repository
      .createQueryBuilder("application")
      .leftJoinAndSelect(
        "application.career",
        "career",
        "career.isDeleted = false"
      )
      .leftJoinAndSelect(
        "application.replies",
        "replies",
        "replies.isDeleted = false"
      )
      .where("application.id = :id", { id })
      .andWhere("application.isDeleted = false")
      .getOne();

    if (!application) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, data: application };
  }

  async updateApplication(
    id: string,
    data: IApplication
  ): Promise<{ status: number }> {
    const application = await this.repository.findOne({ where: { id } });
    if (!application) return { status: StatusCode.NOT_FOUND };

    const oldFilesToDelete: string[] = [];

    if (data.resumeUrl && application.resumeUrl !== data.resumeUrl)
      oldFilesToDelete.push(application.resumeUrl);

    if (
      data.coverLetterUrl &&
      application.coverLetterUrl !== data.coverLetterUrl
    )
      oldFilesToDelete.push(application.coverLetterUrl);

    if (data.careerId) {
      const career = await this.careerRepo.findOne({
        where: { id: data.careerId, isDeleted: false },
      });
      if (!career) return { status: StatusCode.NOT_FOUND };
      application.career = career;
    }

    this.repository.merge(application, data);
    await this.repository.save(application);

    if (oldFilesToDelete.length) {
      deleteMedia({ urls: oldFilesToDelete }).catch(console.error);
    }

    return { status: StatusCode.OK };
  }
  async deleteApplication(
    ids: string[]
  ): Promise<{ status: number; deletedIds: string[] }> {
    const apps = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id", "resumeUrl", "coverLetterUrl"],
    });

    if (!apps.length) return { status: StatusCode.NOT_FOUND, deletedIds: [] };

    const urls = apps
      .flatMap((a) => [a.resumeUrl, a.coverLetterUrl])
      .filter(Boolean);

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    if (urls.length) deleteMedia({ urls }).catch(console.error);

    return { status: StatusCode.OK, deletedIds: ids };
  }

  async recoverDeletedApplications(
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

  async getDeletedApplications(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const where = search
      ? [
          { name: Like(`%${search}%`), isDeleted: true },
          { email: Like(`%${search}%`), isDeleted: true },
        ]
      : { isDeleted: true };

    const [applications, total] = await this.repository.findAndCount({
      where,
      order: { updatedAt: "DESC" },
      skip,
      take: limit,
      relations: ["career"],
      select: [
        "id",
        "name",
        "email",
        "phone",
        "position",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    return {
      status: StatusCode.OK,
      data: {
        applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
