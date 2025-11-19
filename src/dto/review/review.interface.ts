export interface IReview {
  id?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  title?: string;
  comment?: string;
  rating?: number;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
