import { z } from 'zod';
import { Role } from '../../../generated/prisma/enums';

export const registerUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([Role.DEVELOPER, Role.EVALUATOR]),
});

export const verifyUserEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const loginUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
