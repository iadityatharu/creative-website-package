import { BaseService } from "../base.service";
import { TeamMember as TeamMemberEntity } from "../../entities/teamMember.entity";
import { ITeamMember } from "../../dto/teammember/teammember.interface";
import { deleteMedia } from "../../functions/deleteMedia";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";
import { Like } from "typeorm";

export class TeamMember extends BaseService<TeamMemberEntity> {
  constructor() {
    super(TeamMemberEntity);
  }

  async createMember(data: ITeamMember): Promise<{ status: number }> {
    const member = this.repository.create(data);
    await this.repository.save(member);
    return { status: StatusCode.CREATED };
  }

  async getAllMembers(
    page = 1,
    limit = 10
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const [members, total] = await this.repository.findAndCount({
      where: { isDeleted: false },
      skip,
      take: limit,
      order: { fullname: "ASC" },
    });

    return {
      status: StatusCode.OK,
      data: {
        members,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMemberById(
    id: string
  ): Promise<{ status: number; member?: TeamMemberEntity }> {
    const member = await this.repository.findOne({ where: { id } });
    if (!member) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, member };
  }

  async updateMember(
    id: string,
    data: ITeamMember
  ): Promise<{ status: number }> {
    const member = await this.repository.findOne({ where: { id } });
    if (!member) return { status: 404 };

    const oldFiles: string[] = [];
    if (data.image && member.image && member.image !== data.image) {
      oldFiles.push(member.image);
    }

    this.repository.merge(member, data);
    await this.repository.save(member);

    if (oldFiles.length) {
      await deleteMedia({ urls: oldFiles }).catch(console.error);
    }

    return { status: StatusCode.OK };
  }

  async deleteMember(
    id: string
  ): Promise<{ status: number; deletedId?: string }> {
    const member = await this.repository.findOne({
      where: { id, isDeleted: false },
      select: ["id"],
    });
    if (!member) return { status: StatusCode.NOT_FOUND };
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id = :id", { id })
      .execute();
    return { status: StatusCode.OK, deletedId: id };
  }

  async hardDeleteMembers(
    ids: string[] | string
  ): Promise<{ status: number; deletedIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const members = await this.repository.find({
      where: { id: In(ids) },
      select: ["id", "image"],
    });

    if (!members.length)
      return { status: StatusCode.NOT_FOUND, deletedIds: [] };

    const memberIds = members.map((member) => member.id);
    const urls = members
      .map((member) => member.image)
      .filter((url): url is string => Boolean(url));

    await this.repository.delete({ id: In(memberIds) });

    if (urls.length) {
      deleteMedia({ urls }).catch(console.error);
    }

    return { status: StatusCode.OK, deletedIds: memberIds };
  }

  async recoverDeletedMembers(
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

  async getDeletedMembers(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const where = search
      ? [
          { fullname: Like(`%${search}%`), isDeleted: true },
          { role: Like(`%${search}%`), isDeleted: true },
        ]
      : { isDeleted: true };

    const [members, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { fullname: "ASC" },
    });

    return {
      status: StatusCode.OK,
      data: {
        members,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
