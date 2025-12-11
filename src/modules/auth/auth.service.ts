import moment from 'moment';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { OtpService } from '../otp/otp.service';
import { User } from '../user/user.model';
import bcrypt from 'bcrypt';
import { TUser } from '../user/user.interface';
import { config } from '../../config';
import { TokenService } from '../token/token.service';
import { TokenType } from '../token/token.interface';
import { OtpType } from '../otp/otp.interface';
import { Secret } from 'jsonwebtoken';
import { UserCompany } from '../userCompany/userCompany.model';
import { Company } from '../company/company.model';

const validateUserStatus = (user: TUser) => {
  if (user.isDeleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your account has been deleted. Please contact support',
    );
  }
};

// ✅ NEW: Helper to generate tokens for Social Login
const createToken = async (user: any) => {
  // Ensure we are working with a plain object
  const userObject = user.toObject ? user.toObject() : user;
  
  // Use your existing TokenService
  const tokens = await TokenService.accessAndRefreshToken(userObject);
  return tokens;
};

const createUser = async (userData: TUser) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else {
      Object.assign(existingUser, userData);
      existingUser.password = userData.password;
      await existingUser.save();

      const verificationToken = await TokenService.createVerifyEmailToken(
        existingUser,
      );
      const { otp } = await OtpService.createVerificationEmailOtp(
        existingUser.email,
      );
      console.log('OTP ::: FIXME 🟢🟢', otp);
      return { otp, verificationToken };
    }
  }

  if (userData.role !== 'projectSupervisor') {
    userData.superVisorsManagerId = null;
  }

  const user = await User.create(userData);

  if (userData.companyId) {
    const company = await Company.findById(userData.companyId);
    if (!company) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Company Name is not valid');
    }

    if (
      userData.role === 'projectSupervisor' &&
      !userData.superVisorsManagerId
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'SuperVisor Manager Id is required',
      );
    }

    const userCompany = await UserCompany.create({
      userId: user._id,
      companyId: userData.companyId,
      role: userData.role,
    });

    if (!userCompany) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'User Company could not be created',
      );
    }
  }

  const verificationToken = await TokenService.createVerifyEmailToken(user);
  const { otp } = await OtpService.createVerificationEmailOtp(user.email);
  console.log('OTP ::: FIXME 🟢🟢', otp);
  return { otp, user, verificationToken };
};

const login = async (email: string, reqpassword: string, fcmToken: string) => {
  const user = await User.findOne({ email }).select(
    '+password fname lname role companyId isPasswordTemporary',
  );

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.isEmailVerified === false) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User not verified, Please verify your email, Check your email.',
    );
  }

  validateUserStatus(user);

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Account is locked. Try again after ${config.auth.lockTime} minutes`,
    );
  }

  const isPasswordValid = await bcrypt.compare(reqpassword, user.password);
  if (!isPasswordValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= config.auth.maxLoginAttempts) {
      user.lockUntil = moment().add(config.auth.lockTime, 'minutes').toDate();
      await user.save();
      throw new ApiError(
        423,
        `Account locked for ${config.auth.lockTime} minutes due to too many failed attempts`,
      );
    }

    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.save();
  }

  const userCompany = await UserCompany.findOne({ userId: user._id });

  if (userCompany && !user.companyId) {
    console.log(
      `Fixing missing companyId for user: ${user.email}. Setting to: ${userCompany.companyId}`,
    );
    user.companyId = userCompany.companyId;
    await user.save();
  }

  const userObject = user.toObject();
  const tokens = await TokenService.accessAndRefreshToken(userObject);

  if (fcmToken) {
    user.fcmToken = fcmToken;
    await user.save();
  }

  const { password, ...userWithoutPassword } = userObject;

  return {
    userWithoutPassword,
    tokens,
    isSetupComplete: userCompany ? true : false,
  };
};

const verifyEmail = async (email: string, token: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  await TokenService.verifyToken(
    token,
    config.token.TokenSecret,
    user?.isResetPassword ? TokenType.RESET_PASSWORD : TokenType.VERIFY,
  );

  await OtpService.verifyOTP(
    user.email,
    otp,
    user?.isResetPassword ? OtpType.RESET_PASSWORD : OtpType.VERIFY,
  );

  user.isEmailVerified = true;
  await user.save();

  const tokens = await TokenService.accessAndRefreshToken(user);
  return { user, tokens };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  const resetPasswordToken = await TokenService.createResetPasswordToken(user);
  const otp = await OtpService.createResetPasswordOtp(user.email);
  user.isResetPassword = true;
  await user.save();
  return { resetPasswordToken, otp };
};

const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user?.isResetPassword) {
    const resetPasswordToken = await TokenService.createResetPasswordToken(
      user,
    );
    const otp = await OtpService.createResetPasswordOtp(user.email);
    return { resetPasswordToken, otp };
  }
  const verificationToken = await TokenService.createVerifyEmailToken(user);
  const otp = await OtpService.createVerificationEmailOtp(user.email);
  return { verificationToken, otp };
};

const resetPassword = async (
  email: string,
  newPassword: string,
  otp: string,
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isOtpVerified = await OtpService.checkOTP(otp);

  if (!isOtpVerified) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found or expired');
  }

  user.password = newPassword;
  user.isResetPassword = false;
  await user.save();
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

const setInitialPassword = async (userId: string, newPassword: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (!user.isPasswordTemporary) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This account has already been activated.',
    );
  }

  user.password = newPassword;
  user.isPasswordTemporary = false;
  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

const logout = async (refreshToken: string) => {};

const refreshAuth = async (refreshToken: string) => {
  const verifyUser = await TokenService.verifyToken(
    refreshToken,
    config.jwt.refreshSecret as Secret,
    TokenType.REFRESH,
  );

  console.log('verify User :: 🧑‍💻🟢', verifyUser);
  let tokens;
  if (verifyUser) {
    tokens = await TokenService.accessAndRefreshTokenForRefreshToken(
      verifyUser,
    );
  }

  return tokens;
};

export const AuthService = {
  createUser,
  login,
  createToken, // ✅ EXPORTED to fix Controller error
  verifyEmail,
  resetPassword,
  forgotPassword,
  resendOtp,
  logout,
  changePassword,
  refreshAuth,
  setInitialPassword,
};