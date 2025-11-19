export interface IPasswordHistory {
  passwordHash?: string;
  createdAt?: Date;
}

export interface IAuth {
  id?: string;
  passwordHash?: string;
  passwordHistory?: IPasswordHistory[];
  otpHash?: string;
  otpExpiry?: Date;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IResetLink {
  status?: number;
  data?: string;
  resetPassword?: string;
}

export interface IGenericResponse {
  status?: number;
  message?: string;
}
