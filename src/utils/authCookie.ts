import { Response } from 'express';
import ms from 'ms';
import config from '../config';

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

const expiresInToMs = (
  expiresIn: string | undefined,
  fallback: Parameters<typeof ms>[0],
) => ms((expiresIn || fallback) as Parameters<typeof ms>[0]);

const cookieOptions = {
  httpOnly: true, // true/false
  secure: config.node_env === 'production', // http / https
  sameSite:
    config.node_env === 'production' ? ('none' as const) : ('lax' as const),
}; // none / strict / lax

export const setAuthCookie = (res: Response, tokenInfo: AuthTokens) => {
  if (tokenInfo.accessToken) {
    res.cookie('accessToken', tokenInfo.accessToken, {
      ...cookieOptions,
      maxAge: expiresInToMs(config.jwt_access_expires_in, '1d'),
    });
  }

  if (tokenInfo.refreshToken) {
    res.cookie('refreshToken', tokenInfo.refreshToken, {
      ...cookieOptions,
      maxAge: expiresInToMs(config.jwt_refresh_expires_in, '7d'),
    });
  }
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
