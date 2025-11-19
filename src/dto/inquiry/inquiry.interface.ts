export interface IInquiry {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  productId?: string;
  isHandled?: boolean;
  replies?: any[];
  repliedBy?: string;
}
