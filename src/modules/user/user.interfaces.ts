export interface IUpdateUserProfilePayload {
  name?: string;
  bio?: string;
  profession?: string;
  company?: string;
  experience?: number;
  skills?: string[];
}

export interface IPresignAvatarUploadPayload {
  contentType: string;
  fileSize: number;
}

export interface IConfirmAvatarUploadPayload {
  key: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
