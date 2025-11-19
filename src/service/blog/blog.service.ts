import { BaseService } from "../base.service";
import { BlogPost as BlogPostEntity } from "../../entities/blog.entity";
import { MediaAsset } from "../../entities/mediaAssets.entity";
import { StatusCode } from "../../constant/statusCode.interface";
import { IBlogPost } from "../../dto/blog/blog.interface";
import { In, SelectQueryBuilder } from "typeorm";
import { isUUID } from "class-validator";
import { MediaType, SeoEntityType } from "../../constant/enum.constant";
import { AppDataSource } from "../../configs/psqlDb.config";
import { User } from "../../entities/user.entity";
import { SeoMetadataService } from "../seo-metadata/seo-metadata.service";
import { deleteMedia } from "../../functions/deleteMedia";

export class BlogPost extends BaseService<BlogPostEntity> {
  private userRepo = AppDataSource.getRepository(User);
  private seoMetadataService = new SeoMetadataService();
  private mediaAssetRepo = AppDataSource.getRepository(MediaAsset);

  constructor() {
    super(BlogPostEntity);
  }

  async createBlog(
    data: IBlogPost,
    mediaUrls?: string[]
  ): Promise<{ status: number }> {
    const existing = await this.repository.findOne({
      where: { slug: data.slug },
    });
    if (existing) return { status: StatusCode.ALREADY_EXIST };

    const { author: authorId, ...rest } = data;
    const user = await this.userRepo.findOne({ where: { id: authorId } });
    if (!user) return { status: StatusCode.NOT_FOUND };

    const blog = this.repository.create({
      ...rest,
      author: user,
    });
    await this.repository.save(blog);

    if (mediaUrls?.length) {
      const mediaEntities = mediaUrls.map((url) =>
        MediaAsset.create({
          fileUrl: url,
          blogPost: blog,
          type: MediaType.IMAGE,
        })
      );
      await MediaAsset.save(mediaEntities);
    }

    return { status: StatusCode.CREATED };
  }

  async getAllBlogs(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("blog")
      .leftJoinAndSelect("blog.author", "author")
      .leftJoinAndSelect("blog.mediaAssets", "media", "media.isDeleted = false")
      .where("blog.isDeleted = false");

    if (search) {
      query.andWhere("(blog.title ILIKE :search OR blog.slug ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    query.orderBy("blog.publishedAt", "DESC").skip(skip).take(limit);

    const [blogs, total] = await query.getManyAndCount();

    const seoMetadataMap = await this.seoMetadataService.getSeoMetadataMap(
      SeoEntityType.BLOG,
      blogs.map((blog) => blog.id)
    );

    const blogsWithSeo = blogs.map((blog) => {
      const plain = JSON.parse(JSON.stringify(blog));
      plain.seoMetadata = seoMetadataMap[blog.id] ?? null;
      return plain;
    });

    return {
      status: StatusCode.OK,
      data: {
        blogs: blogsWithSeo,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBlogByIdentifier(
    identifier: string
  ): Promise<{ status: number; blog?: any; similarBlogs?: any[] }> {
    const query = this.repository
      .createQueryBuilder("blog")
      .leftJoinAndSelect("blog.author", "author")
      .leftJoinAndSelect("blog.mediaAssets", "media", "media.isDeleted = false")
      .where("blog.isDeleted = false");

    if (isUUID(identifier)) {
      query.andWhere("blog.id = :id", { id: identifier });
    } else {
      query.andWhere("blog.slug = :slug", { slug: identifier });
    }

    const blog = await query.getOne();

    if (!blog) return { status: StatusCode.NOT_FOUND };

    this.filterDeletedMediaAssets(blog);

    const seoMetadata =
      await this.seoMetadataService.getSeoMetadataForEntity(
        SeoEntityType.BLOG,
        blog.id
      );

    const similarBlogs = await this.getSimilarBlogs(blog, 4);
    const similarIds = similarBlogs.map((item) => item.id);
    const similarSeo = similarIds.length
      ? await this.seoMetadataService.getSeoMetadataMap(
          SeoEntityType.BLOG,
          similarIds
        )
      : {};

    const blogPlain = JSON.parse(JSON.stringify(blog));
    blogPlain.seoMetadata = seoMetadata;

    const similarPlain = similarBlogs.map((item) => {
      const plain = JSON.parse(JSON.stringify(item));
      plain.seoMetadata = similarSeo[item.id] ?? null;
      return plain;
    });

    return {
      status: StatusCode.OK,
      blog: blogPlain,
      similarBlogs: similarPlain,
    };
  }

  async updateBlog(
    id: string,
    data: IBlogPost,
    addedMediaUrls?: string[],
    removedMediaIds?: string[]
  ): Promise<{ status: number }> {
    const blog = await this.repository.findOne({
      where: { id },
      relations: ["author", "mediaAssets"],
    });
    if (!blog) return { status: StatusCode.NOT_FOUND };

    if (data.author) {
      const user = await this.userRepo.findOne({ where: { id: data.author } });
      if (!user) return { status: StatusCode.NOT_FOUND };
      blog.author = user;
    }

    const { author, ...rest } = data;
    this.repository.merge(blog, rest);
    await this.repository.save(blog);

    if (addedMediaUrls?.length) {
      const newMedia = addedMediaUrls.map((url) =>
        MediaAsset.create({
          fileUrl: url,
          blogPost: blog,
          type: MediaType.IMAGE,
        })
      );
      await MediaAsset.save(newMedia);
    }

    if (removedMediaIds?.length) {
      await MediaAsset.createQueryBuilder()
        .update()
        .set({ isDeleted: true })
        .where("id IN (:...ids)", { ids: removedMediaIds })
        .execute();
    }

    return { status: StatusCode.OK };
  }

  async deleteBlog(
    ids: string[] | string
  ): Promise<{ status: number; deletedBlogIds: string[] }> {
    if (!Array.isArray(ids)) ids = [ids];

    const blogs = await this.repository.find({
      where: { id: In(ids), isDeleted: false },
    });
    if (!blogs.length)
      return { status: StatusCode.NOT_FOUND, deletedBlogIds: [] };

    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where("id IN (:...ids)", { ids })
      .execute();

    return { status: StatusCode.OK, deletedBlogIds: ids };
  }

  async hardDeleteBlogs(
    ids: string[] | string
  ): Promise<{
    status: number;
    deletedBlogIds: string[];
    deletedAssets: number;
  }> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (!idList.length)
      return {
        status: StatusCode.BAD_REQUEST,
        deletedBlogIds: [],
        deletedAssets: 0,
      };

    const blogs = await this.repository.find({
      where: { id: In(idList) },
      relations: ["mediaAssets"],
    });

    if (!blogs.length)
      return {
        status: StatusCode.NOT_FOUND,
        deletedBlogIds: [],
        deletedAssets: 0,
      };

    const blogIds = blogs.map((blog) => blog.id);
    const assetUrls = [
      ...blogs.map((blog) => blog.coverImage ?? ""),
      ...blogs.flatMap((blog) =>
        (blog.mediaAssets ?? [])
          .map((asset) => asset.fileUrl)
          .filter((url): url is string => Boolean(url))
      ),
    ].filter(Boolean);

    if (assetUrls.length) {
      deleteMedia({ urls: assetUrls }).catch(console.error);
    }

    await this.mediaAssetRepo
      .createQueryBuilder()
      .delete()
      .from(MediaAsset)
      .where('"blogPostId" IN (:...ids)', { ids: blogIds })
      .execute();

    await this.repository.delete({ id: In(blogIds) });

    return {
      status: StatusCode.OK,
      deletedBlogIds: blogIds,
      deletedAssets: assetUrls.length,
    };
  }

  async recoverDeletedBlogs(
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

  async getDeletedBlogs(
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{ status: number; data: object }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("blog")
      .leftJoinAndSelect("blog.author", "author")
      .leftJoinAndSelect("blog.mediaAssets", "media", "media.isDeleted = false")
      .where("blog.isDeleted = true");

    if (search) {
      query.andWhere("(blog.title ILIKE :search OR blog.slug ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    query.orderBy("blog.updatedAt", "DESC").skip(skip).take(limit);

    const [blogs, total] = await query.getManyAndCount();

    const seoMetadataMap = await this.seoMetadataService.getSeoMetadataMap(
      SeoEntityType.BLOG,
      blogs.map((blog) => blog.id)
    );

    const blogsWithSeo = blogs.map((blog) => {
      const plain = JSON.parse(JSON.stringify(blog));
      plain.seoMetadata = seoMetadataMap[blog.id] ?? null;
      return plain;
    });

    return {
      status: StatusCode.OK,
      data: {
        blogs: blogsWithSeo,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getSimilarBlogs(
    baseBlog: BlogPostEntity,
    limit = 4
  ): Promise<BlogPostEntity[]> {
    const similar: BlogPostEntity[] = [];
    const seenIds = new Set<string>([baseBlog.id]);

    const fetch = async (
      configure?: (qb: SelectQueryBuilder<BlogPostEntity>) => void
    ) => {
      const remaining = limit - similar.length;
      if (remaining <= 0) return;

      const qb = this.repository
        .createQueryBuilder("blog")
        .leftJoinAndSelect("blog.author", "author")
        .leftJoinAndSelect("blog.mediaAssets", "media", "media.isDeleted = false")
        .where("blog.isDeleted = false")
        .andWhere("blog.id != :id", { id: baseBlog.id })
        .orderBy("blog.publishedAt", "DESC")
        .addOrderBy("blog.createdAt", "DESC")
        .take(remaining);

    if (seenIds.size > 1) {
      qb.andWhere("blog.id NOT IN (:...excludeIds)", {
        excludeIds: Array.from(seenIds),
      });
    }

    configure?.(qb);

    const results = await qb.getMany();
      for (const candidate of results) {
        this.filterDeletedMediaAssets(candidate);
      if (seenIds.has(candidate.id)) continue;
      seenIds.add(candidate.id);
      similar.push(candidate);
      if (similar.length >= limit) break;
    }
  };

    if (baseBlog.author?.id) {
      await fetch((qb) =>
        qb.andWhere("author.id = :authorId", {
          authorId: baseBlog.author!.id,
        })
      );
    }

    if (similar.length < limit) {
      await fetch();
    }

    return similar;
  }

  private filterDeletedMediaAssets(blog: BlogPostEntity) {
    if (Array.isArray(blog.mediaAssets)) {
      blog.mediaAssets = blog.mediaAssets.filter(
        (asset) => !asset.isDeleted
      );
    }
  }
}
