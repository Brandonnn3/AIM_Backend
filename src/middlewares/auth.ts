import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import { User } from '../modules/user/user.model';
import ApiError from '../errors/ApiError';
import catchAsync from '../shared/catchAsync';
import { config } from '../config';
import { TokenType } from '../modules/token/token.interface';
import { TokenService } from '../modules/token/token.service';

const auth = (...requiredRoles: string[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }

    const token = tokenWithBearer.split(' ')[1];
    
    // This function returns the decoded payload which includes userId, role, etc.
    const verifiedUserPayload = await TokenService.verifyToken(
      token,
      config.jwt.accessSecret as Secret,
      TokenType.ACCESS
    );

    if (!verifiedUserPayload || !verifiedUserPayload.userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token payload. Please log in again.');
    }

    // It's good practice to ensure the user still exists in the database.
    const userFromDb = await User.findById(verifiedUserPayload.userId).lean();

    if (!userFromDb) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User associated with this token not found.');
    }
    if (!userFromDb.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Your account is not verified.');
    }
    
    // ✅ DEFINITIVE FIX: Attach the verified token payload to the request.
    // This ensures that `req.user.userId` and `req.user.role` are available downstream.
    (req as any).user = verifiedUserPayload;

    // Perform role check if any roles are required for the route.
    if (requiredRoles.length) {
      const userRole = verifiedUserPayload.role; // Get role from the token
      if (!requiredRoles.includes(userRole)) {
         throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this resource."
        );
      }
    }

    next();
  });

export default auth;
