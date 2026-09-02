import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import config from '../config';
import { prisma } from '../lib/prisma';
import { AuthProvider, Role, UserStatus } from '../../generated/prisma/client';
import { ApiError } from '../errors/ApiError';

export const seedAdmin = async () => {
  try {
    const isAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });

    if (isAdminExist) {
      console.log('Admin Already Exists!');
      return;
    }

    const name = config.admin_name;
    const email = config.admin_email;
    const password = config.admin_password;

    if (!name || !email || !password) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Admin Name , Email, Password is Missing In Env File!!!',
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        bio: 'Admin user for DevAssess',
        profession: 'Admin Management',
        company: 'DevAssess',
        experience: 10,
        skills: ['Admin', 'Management'],
        role: Role.ADMIN,
        status: UserStatus.VERIFIED,
        auths: {
          create: {
            provider: AuthProvider.CREDENTIALS,
            providerId: email,
          },
        },
      },
      include: { auths: true },
      omit: { password: true },
    });

    console.log('Admin is Created : ', admin);
  } catch (error) {
    console.log('Error Seeding Admin : ', error);

    await prisma.user.delete({
      where: {
        email: config.admin_email,
      },
    });
  }
};
