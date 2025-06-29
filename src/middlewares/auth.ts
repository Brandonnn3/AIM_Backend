import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import { roleRights } from './roles';
import { User } from '../modules/user/user.model';
import ApiError from '../errors/ApiError';
import catchAsync from '../shared/catchAsync';
import { config } from '../config';
import { TokenType } from '../modules/token/token.interface';
import { TokenService } from '../modules/token/token.service';

const auth = (...roles: string[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Step 1: Get Authorization Header
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
    if (tokenWithBearer.startsWith('Bearer')) {
      const token = tokenWithBearer.split(' ')[1];
      // Step 2: Verify Token
      const verifyUser = await TokenService.verifyToken(
        token,
        config.jwt.accessSecret as Secret,
        TokenType.ACCESS
      );

      // if(verifyUser){
      //   throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      // }

      // Step 3: Attach user to the request object
      req.user = verifyUser;

      // Step 4: Check if the user exists and is active
      const user = await User.findById(verifyUser.userId);
      if (!user) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found.');
      } else if (!user.isEmailVerified) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Your account is not verified.'
        );
      }

      // Step 5: Role-based Authorization
      if (roles.length) {
        const userRole = roleRights.get(verifyUser?.role);
        const hasRole = userRole?.some(role => roles.includes(role));
        if (!hasRole) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this API"
          );
        }
      }

      next();
    } else {
      // If the token format is incorrect
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
  });

export default auth;
