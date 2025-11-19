import { ApplicationStatus } from "../../constant/enum.constant";

export interface IApplication {
  id?: string;
  name?: string;
  email?: string;
  position?: string;
  phone?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  status?: ApplicationStatus;
  careerId?: string;
}
