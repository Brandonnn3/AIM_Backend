import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import ApiError from '../../errors/ApiError';
import { TUser } from '../user/user.interface';

const register = catchAsync(async (req, res) => {
  const result = await AuthService.createUser(req.body);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'User created successfully, please verify your email',
    data: result,
    success: true,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password, fcmToken } = req.body;
  const result = await AuthService.login(email, password, fcmToken);

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data: result,
    success: true,
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, token, otp } = req.body;
  const result = await AuthService.verifyEmail(email, token, otp);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Email verified successfully',
    data: {
      result,
    },
    success: true,
  });
});

const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Otp sent successfully',
    data: result,
    success: true,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset email sent successfully',
    data: result,
    success: true,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const userId = user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'currentPassword and newPassword  is required'
    );
  }
  const result = await AuthService.changePassword(
    (userId as any).toString(),
    currentPassword,
    newPassword
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password changed successfully',
    data: result,
    success: true,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, password, otp } = req.body;
  const result = await AuthService.resetPassword(email, password, otp);
  if (!result) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset successfully',
    data: {
      result,
    },
    success: true,
  });
});

const setInitialPassword = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const userId = user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  const { newPassword } = req.body;
  if (!newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'A new password is required.');
  }

  const result = await AuthService.setInitialPassword((userId as any).toString(), newPassword);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password has been set successfully. Please log in again.',
    data: result,
    success: true,
  });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(req.body.refreshToken);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged out successfully',
    data: {},
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const tokens = await AuthService.refreshAuth(req.body.refreshToken);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data:
      {
        tokens,
      },
  });
});

export const AuthController = {
  register,
  login,
  verifyEmail,
  resendOtp,
  logout,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  setInitialPassword,
};
