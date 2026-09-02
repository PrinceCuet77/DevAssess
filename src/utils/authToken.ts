import { JwtPayload, SignOptions } from 'jsonwebtoken';
import { jwtUtils } from './jwt';
import config from '../config';

export const createUserTokens = (id: string, email: string, role: string) => {
  const jwtPayload = { id, email, role };

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
    accessToken,
    refreshToken,
  };
};

// export const createNewAccessTokenWithRefreshToken = async (
//   refreshToken: string,
// ) => {
//   const verifiedRefreshToken = verifyToken(
//     refreshToken,
//     config.JWT_REFRESH_SECRET,
//   ) as JwtPayload;

//   const user = await prisma.user.findUnique({
//     where: {
//       email: verifiedRefreshToken.email,
//     },
//   });

//   if (!user) {
//     throw new Error("User does not exist");
//   }

//   const jwtPayload = {
//     userId: user.id,
//     email: user.email,
//     role: user.role,
//   };

//   const accessToken = generateToken(
//     jwtPayload,
//     config.JWT_ACCESS_SECRET,
//     config.JWT_ACCESS_EXPIRES,
//   );

//   return accessToken;
// };
