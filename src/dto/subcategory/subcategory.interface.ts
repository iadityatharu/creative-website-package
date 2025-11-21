export interface ISubCategory {
  id?: string;
  title?: string;
  slug?: string;
  categoryId?: string;
  description?: string | Record<string, unknown>;
  coverImage?: string | null;
  products?: any[];
  sortOrder?: number;
}
