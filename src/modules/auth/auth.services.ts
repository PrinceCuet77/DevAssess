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
import {
  IForgotPasswordPayload,
  IRegisterPayload,
  IRegistrationOtpPayload,
  IVerifyEmailPayload,
} from './auth.interfaces';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import { jwtUtils } from '../../utils/jwt';
import { createUserTokens } from '../../utils/authToken';

const registerUser = async (payload: IRegisterPayload) => {
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

const verifyUserEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const otpKey = `user-registration-otp:${email}`;
  const redisOtp = await redisClient.get(otpKey);
  if (!redisOtp) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  if (redisOtp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP Does Not Match');
  }

  await redisClient.del(otpKey);

  const userRegistrationKey = `user-registration-data:${email}`;
  const redisUserData = await redisClient.get(userRegistrationKey);

  if (!redisUserData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User doesnt exist!');
  }

  const userPayload: IRegistrationOtpPayload = JSON.parse(redisUserData);

  const createdUser = userPayload.linkToUserId
    ? await prisma.user.update({
        where: { id: userPayload.linkToUserId },
        data: {
          password: userPayload.password,
          status: UserStatus.VERIFIED,
          auths: {
            create: {
              provider: AuthProvider.CREDENTIALS,
              providerId: email,
            },
          },
        },
        omit: { password: true },
        include: { auths: true },
      })
    : await prisma.user.create({
        data: {
          email: userPayload.email,
          password: userPayload.password,
          role: userPayload.role,
          status: UserStatus.VERIFIED,
          auths: {
            create: {
              provider: AuthProvider.CREDENTIALS,
              providerId: email,
            },
          },
        },
        omit: { password: true },
        include: { auths: true },
      });

  await redisClient.del(userRegistrationKey);

  const tempatePath = path.join(
    process.cwd(),
    'src/templates/user-welcome-email.ejs',
  );

  const templateData = {
    email: createdUser.email,
    role: createdUser.role === Role.DEVELOPER ? 'Developer' : 'Evaluator',
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: 'Welcome To User Management System',
    html,
  });

  const jwtPayload = {
    userId: createdUser.id,
    email: createdUser.email,
    role: createdUser.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    createdUser,
    accessToken,
    refreshToken,
  };
};

const refreshTokenIntoNewAccessToken = async (token: string) => {
  const verifiedToken = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

  if (!verifiedToken.success) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Invalid or expired refresh token',
    );
  }

  // Payload/user lookup is provider-agnostic — works the same whether the
  // session originated from credentials login or Google login.
  const { id } = verifiedToken.data as JwtPayload;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is suspended');
  }

  if (user.status === UserStatus.DELETED) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is deleted');
  }

  const { accessToken, refreshToken } = createUserTokens(
    user.id,
    user.email,
    user.role,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      auths: true,
    },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is not found!');
  }

  if (isUserExist.status === UserStatus.SUSPENDED) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is suspended');
  }

  if (isUserExist.status === UserStatus.NOT_VERIFIED) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User Not Verified');
  }

  if (isUserExist.status === UserStatus.DELETED) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is Deleted');
  }

  const hasCredentials = isUserExist.auths.some(
    (auth) => auth.provider === AuthProvider.CREDENTIALS,
  );

  if (!hasCredentials) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This account only has a Google login, there is no password to reset',
    );
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgor-password-otp:${isUserExist.email}`;
  const expirationSeconds = 5 * 60;

  await redisClient.set(key, otp, {
    expiration: {
      type: 'EX',
      value: expirationSeconds,
    },
  });

  const tempatePath = path.join(
    process.cwd(),
    'src/templates/forgot-password.ejs',
  );

  const templateData = {
    email: isUserExist.email,
    otp,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: isUserExist.email,
    subject: 'Forgot Password',
    html,
  });
};


export const AuthServices = {
  registerUser,
  verifyUserEmail,
  refreshTokenIntoNewAccessToken,
  forgotPassword,
};
