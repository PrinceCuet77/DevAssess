import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';
import bcryptjs from 'bcryptjs';
import { AuthProvider, Role, UserStatus } from '../../generated/prisma/client';
import { ApiError } from '../errors/ApiError';
import httpStatus from 'http-status';
import config from './index';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return done(null, false, {
            message: 'User is not exists!',
          });
        }

        if (user.status === UserStatus.SUSPENDED) {
          throw new ApiError(httpStatus.FORBIDDEN, 'User is suspended');
        }

        if (user.status === UserStatus.DELETED) {
          throw new ApiError(httpStatus.FORBIDDEN, 'User is deleted');
        }

        if (!user.password) {
          return done(null, false, {
            message:
              'This account does not have password, Please login with google',
          });
        }

        const isPasswordMatch = await bcryptjs.compare(password, user.password);

        if (!isPasswordMatch) {
          return done(null, false, {
            message: 'Password does not matched',
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);
