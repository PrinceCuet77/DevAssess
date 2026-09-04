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

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google_client_id as string,
      clientSecret: config.google_client_secret as string,
      callbackURL: config.google_callback_url as string,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const email = profile.emails?.[0].value;

        if (!email) {
          return done(null, false, {
            message: 'No email found from google!',
          });
        }

        let user = await prisma.user.findUnique({
          where: {
            email,
          },
          include: {
            auths: true,
          },
        });

        if (user) {
          if (user.status === UserStatus.SUSPENDED) {
            return done(null, false, { message: 'User is suspended' });
          }

          if (user.status === UserStatus.DELETED) {
            return done(null, false, { message: 'User is deleted' });
          }

          const googleAuth = user.auths.find(
            (auth) => auth.provider === AuthProvider.GOOGLE,
          );

          if (!googleAuth) {
            // User already has a credentials login — link the Google account to it.
            await prisma.auth.create({
              data: {
                provider: AuthProvider.GOOGLE,
                providerId: profile.id,
                userId: user.id,
              },
            });
          }

          if (user.status === UserStatus.NOT_VERIFIED) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { status: UserStatus.VERIFIED },
              include: { auths: true },
            });
          }

          return done(null, user);
        }

        user = await prisma.user.create({
          data: {
            name: profile.displayName,
            email,
            role: Role.DEVELOPER,
            status: UserStatus.VERIFIED,
            auths: {
              create: {
                provider: AuthProvider.GOOGLE,
                providerId: profile.id,
              },
            },
          },
          include: {
            auths: true,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);