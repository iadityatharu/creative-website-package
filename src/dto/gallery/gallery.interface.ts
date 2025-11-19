import { MediaType } from "../../constant/enum.constant";

export interface IGallery {
  id?: string;
  caption?: string;
  isHome?: boolean;
  productId: string;
  mediaUrls?: string[];
  mediaTypes?: MediaType[];
}
