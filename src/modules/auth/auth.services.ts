
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../errors/ApiError';
import httpStatus from 'http-status';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import config from '../../config';
import {
  AuthProvider,
  Role,
  UserStatus,
} from '../../../generated/prisma/enums';
import { redisClient } from '../../lib/redis';
import { transporter } from '../../lib/nodemailer';
import ejs from 'ejs';
import { IRegisterPayload, IRegistrationOtpPayload } from './auth.interfaces';

const registerUserIntoDB = async (payload: IRegisterPayload) => {
  const { password, role } = payload;

  const email = payload.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { auths: true },
  });

  let linkToUserId: string | null = null;

  if (existingUser) {
    if (existingUser.status === UserStatus.SUSPENDED) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'User is suspended. Please contact to the admin.',
      );
    }

    if (existingUser.status === UserStatus.DELETED) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User is Deleted');
    }

    const hasCredentials = existingUser.auths.some(
      (auth) => auth.provider === AuthProvider.CREDENTIALS,
    );

    if (hasCredentials) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'User with this email already exists',
      );
    }

    // Account only has a Google login so far — allow adding a credentials
    // login on top of it instead of blocking the signup.
    linkToUserId = existingUser.id;
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const expirationSeconds = 5 * 60;
  const otpKey = `user-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: 'EX',
      value: expirationSeconds,
    },
  });

  const userRegistrationKey = `user-registration-data:${email}`;
  const redisUserDataPayload: IRegistrationOtpPayload = {
    email,
    password: hashedPassword,
    role,
    linkToUserId,
  };

  await redisClient.set(
    userRegistrationKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: 'EX',
        value: expirationSeconds,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    'src/templates/registration-user-otp.ejs',
  );

  const templateData = {
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: 'Email Verification',
    html,
  });
};

export const AuthServices = {
  registerUserIntoDB,
};
