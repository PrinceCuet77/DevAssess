import { z } from 'zod';

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  profession: z.string().trim().max(100).optional(),
  company: z.string().trim().max(100).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  skills: z.array(z.string().trim().min(1)).max(50).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

export const presignAvatarUploadSchema = z.object({
  contentType: z.enum(ALLOWED_AVATAR_MIME_TYPES),
  fileSize: z.number().int().positive().max(MAX_AVATAR_SIZE_BYTES),
});

export const confirmAvatarUploadSchema = z.object({
  key: z.string().min(1),
});
