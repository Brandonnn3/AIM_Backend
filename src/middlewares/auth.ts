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
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }

    const token = tokenWithBearer.split(' ')[1];
    // This verifyToken function internally uses jwt.verify and returns the decoded payload
    const verifiedUserPayload = await TokenService.verifyToken(
      token,
      config.jwt.accessSecret as Secret,
      TokenType.ACCESS
    );

    if (!verifiedUserPayload) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token. Please log in again.');
    }

    // FINAL FIX: Use verifiedUserPayload.userId to find the user
    // The decoded token payload has the 'userId' property.
    const user = await User.findById(verifiedUserPayload.userId);

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User associated with this token not found.');
    }
    if (!user.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account is not verified.');
    }
    
    // Attach the full user object from the database to the request.
    (req as any).user = user;

    if (roles.length) {
      const userRole = roleRights.get(user.role);
      const hasPermission = userRole?.some(role => roles.includes(role));
      if (!hasPermission) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this API"
        );
      }
    }

    next();
  });

export default auth;