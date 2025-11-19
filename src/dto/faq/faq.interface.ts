export interface IFaq {
  id?: string;
  title?: string;
  description?: string | Record<string, unknown>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
