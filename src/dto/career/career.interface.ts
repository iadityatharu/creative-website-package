import { JobType } from "../../constant/enum.constant";

export interface ICareer {
  id?: string;
  title?: string;
  slug?: string;
  department?: string;
  location?: string;
  jobType?: JobType;
  description?: string | Record<string, unknown>;
  requirements?: string;
  salaryRange?: string;
  isOpen?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  sortOrder?: number;
}
