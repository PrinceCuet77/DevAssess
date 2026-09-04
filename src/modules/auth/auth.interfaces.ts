import { Role } from '../../../generated/prisma/enums';

export interface IRegisterPayload {
  email: string;
  password: string;
  role: Role;
}

export interface IRegistrationOtpPayload extends IRegisterPayload {
  linkToUserId: string | null;
}

export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IResetPasswordPayload {
  email: string;
  newPassword: string;
  otp: string;
}
