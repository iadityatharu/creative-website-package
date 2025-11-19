export interface ICategory {
  id?: string;
  title?: string;
  slug?: string;
  description?: string | Record<string, unknown>;
  coverImage?: string | null;
  subCategories?: any[];
}
