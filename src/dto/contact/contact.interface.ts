import { ContactPurpose } from "../../constant/enum.constant";

export interface IContact {
  id?: string;
  fullname?: string;
  email?: string;
  organization?: string;
  phoneNo?: string;
  address?: string;
  messsage?: string;
  purpose?: ContactPurpose;
  createdAt?: Date;
  updatedAt?: Date;
  sortOrder?: number;
}
