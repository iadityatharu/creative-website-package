export interface IBlogPost {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  description?: any;
  coverImage?: string;
  publishedAt?: Date;
  authorId?: string;
  estimatedReadTime?: number;
  isPublished?: boolean;
  mediaUrls?: string[];
  removedMediaIds?: string[];
  author?: string;
  sortOrder?: number;
}
