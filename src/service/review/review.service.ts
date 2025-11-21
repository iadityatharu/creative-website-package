import { BaseService } from "../base.service";
import { Review as ReviewEntity } from "../../entities/review.entity";
import { IReview } from "../../dto/review/review.interface";
import { StatusCode } from "../../constant/statusCode.interface";
import { In } from "typeorm";

export class Review extends BaseService<ReviewEntity> {
  constructor() {
    super(ReviewEntity);
  }

  private baseNotDeletedQuery() {
    return this.repository
      .createQueryBuilder("review")
      .where("review.isDeleted = false");
  }

  async createReview(data: IReview): Promise<{ status: number }> {
    const review = this.repository.create({
      reviewerName: data.reviewerName,
      reviewerEmail: data.reviewerEmail,
      title: data.title,
      comment: data.comment,
      rating: data.rating,
      isPublished: data.isPublished ?? false,
    });
    await this.repository.save(review);
    return { status: StatusCode.CREATED };
  }

  async getAllReviews(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.baseNotDeletedQuery();

    if (search) {
      query.andWhere(
        "(review.reviewerName ILIKE :search OR review.comment ILIKE :search OR review.title ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    query
      .orderBy("review.sortOrder", "ASC")
      .addOrderBy("review.createdAt", "DESC")
      .skip(skip)
      .take(limit);
    const [reviews, total] = await query.getManyAndCount();
    const totalPages = limit ? Math.ceil(total / limit) : 0;

    return {
      status: StatusCode.OK,
      data: {
        reviews,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getReviewById(
    id: string
  ): Promise<{ status: number; review?: ReviewEntity }> {
    const review = await this.baseNotDeletedQuery()
      .andWhere("review.id = :id", { id })
      .getOne();
    if (!review) return { status: StatusCode.NOT_FOUND };
    return { status: StatusCode.OK, review };
  }

  async updateReview(id: string, data: IReview) {
    const review = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!review) return { status: StatusCode.NOT_FOUND };

    this.repository.merge(review, data);
    await this.repository.save(review);
    return { status: StatusCode.OK };
  }

  async deleteReview(ids: string[] | string) {
    if (!Array.isArray(ids)) ids = [ids];

    const reviews = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
      select: ["id"],
    });
    if (!reviews.length)
      return { status: StatusCode.NOT_FOUND, deletedReviewIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedReviewIds: ids };
  }

  async hardDeleteReviews(
    ids: string[] | string
  ): Promise<{ status: number; deletedReviewIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const reviews = await this.repository.find({
      where: { id: In(ids) },
      select: ["id"],
    });

    if (!reviews.length)
      return { status: StatusCode.NOT_FOUND, deletedReviewIds: [] };

    const reviewIds = reviews.map((review) => review.id);
    await this.repository.delete({ id: In(reviewIds) });

    return { status: StatusCode.OK, deletedReviewIds: reviewIds };
  }

  async recoverDeletedReviews(
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

  async getDeletedReviews(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;
    const query = this.repository
      .createQueryBuilder("review")
      .where("review.isDeleted = true");

    if (search) {
      query.andWhere(
        "(review.reviewerName ILIKE :search OR review.comment ILIKE :search OR review.title ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    query.orderBy("review.updatedAt", "DESC").skip(skip).take(limit);
    const [reviews, total] = await query.getManyAndCount();
    const totalPages = limit ? Math.ceil(total / limit) : 0;

    return {
      status: StatusCode.OK,
      data: {
        reviews,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
