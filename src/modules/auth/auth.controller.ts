import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import ApiError from '../../errors/ApiError';
import { TUser } from '../user/user.interface';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { config } from '../../config'; 
import { User } from '../user/user.model';

const googleClient = new OAuth2Client(config.google_client_id);

const register = catchAsync(async (req, res) => {
  const result = await AuthService.createUser(req.body);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'User created successfully',
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

// ✅ GOOGLE LOGIN (FIXED AUDIENCE ISSUE)
const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const { idToken, fcmToken, role } = req.body;

  // 1. Verify Google Token
  // We allow BOTH the Web Client ID (from config) AND the iOS Client ID (from your logs)
  const ticket = await googleClient.verifyIdToken({
    idToken: idToken,
    audience: [
        config.google_client_id, // Web Client ID
        // 👇 This is the iOS ID from your logs. It matches the token coming from the app.
        '962364258936-3qprahmqcnf3ppgelbr6i1oin0k7ggad.apps.googleusercontent.com',
        // If you have an Android Client ID, add it here too
    ],
  });
  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google Token');
  }

  const { email, given_name, family_name, picture } = payload;

  // 2. Find or Create User
  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-8) + 'Aa1@'; 
    user = await User.create({
      email,
      fname: given_name || 'User',
      lname: family_name || '',
      password: randomPassword,
      role: role || 'projectManager',
      profileImage: { imageUrl: picture },
      isEmailVerified: true, 
      isSocialLogin: true, 
      fcmToken: fcmToken
    });
  } else {
    if (fcmToken) {
      await User.findByIdAndUpdate(user._id, { fcmToken });
    }
  }

  // 3. Generate Tokens
  const tokens = await AuthService.createToken(user); 

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Google login successful',
    data: {
      attributes: {
        userWithoutPassword: user,
        tokens,
      }
    },
    success: true,
  });
});

// ✅ APPLE LOGIN
const appleLogin = catchAsync(async (req: Request, res: Response) => {
  const { idToken, firstName, lastName, fcmToken, role } = req.body;

  let email;
  try {
    const appleData = await appleSignin.verifyIdToken(idToken, {
      // ✅ Ensure this matches your iOS Bundle ID (e.g. com.AIM.aimConstructionApp)
      // If config.apple_client_id is empty, this will fail.
      audience: config.apple_client_id, 
      ignoreExpiration: true,
    });
    email = appleData.email;
  } catch (err) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Apple Token');
  }

  if (!email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Apple Token missing email');
  }

  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-8) + 'Aa1@';
    user = await User.create({
      email,
      fname: firstName || 'Apple', 
      lname: lastName || 'User',
      password: randomPassword,
      role: role || 'projectManager',
      isEmailVerified: true,
      isSocialLogin: true,
      fcmToken: fcmToken
    });
  } else {
    if (fcmToken) {
      await User.findByIdAndUpdate(user._id, { fcmToken });
    }
  }

  const tokens = await AuthService.createToken(user);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Apple login successful',
    data: {
      attributes: {
        userWithoutPassword: user,
        tokens,
      }
    },
    success: true,
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, token, otp } = req.body;
  const result = await AuthService.verifyEmail(email, token, otp);
  sendResponse(res, { code: StatusCodes.OK, message: 'Email verified successfully', data: { result }, success: true });
});

const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);
  sendResponse(res, { code: StatusCodes.OK, message: 'Otp sent successfully', data: result, success: true });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  sendResponse(res, { code: StatusCodes.OK, message: 'Password reset email sent successfully', data: result, success: true });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const userId = user?._id;
  if (!userId) throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(StatusCodes.BAD_REQUEST, 'currentPassword and newPassword is required');
  const result = await AuthService.changePassword((userId as any).toString(), currentPassword, newPassword);
  sendResponse(res, { code: StatusCodes.OK, message: 'Password changed successfully', data: result, success: true });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, password, otp } = req.body;
  const result = await AuthService.resetPassword(email, password, otp);
  if (!result) throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  sendResponse(res, { code: StatusCodes.OK, message: 'Password reset successfully', data: { result }, success: true });
});

const setInitialPassword = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const userId = user?._id;
  if (!userId) throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  const { newPassword } = req.body;
  if (!newPassword) throw new ApiError(StatusCodes.BAD_REQUEST, 'A new password is required.');
  const result = await AuthService.setInitialPassword((userId as any).toString(), newPassword);
  sendResponse(res, { code: StatusCodes.OK, message: 'Password set successfully', data: result, success: true });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(req.body.refreshToken);
  sendResponse(res, { code: StatusCodes.OK, message: 'User logged out successfully', data: {} });
});

const refreshToken = catchAsync(async (req, res) => {
  const tokens = await AuthService.refreshAuth(req.body.refreshToken);
  sendResponse(res, { code: StatusCodes.OK, message: 'User logged in successfully', data: { tokens } });
});

export const AuthController = {
  register,
  login,
  googleLogin,
  appleLogin,
  verifyEmail,
  resendOtp,
  logout,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  setInitialPassword,
};