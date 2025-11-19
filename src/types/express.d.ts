import { UserMetadata } from "../entities/userMetaData.entity";

declare global {
  namespace Express {
    interface Request {
      userMetadata?: Partial<UserMetadata>;
      isBot?: boolean;
    }
  }
}
