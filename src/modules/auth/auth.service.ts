// auth.service.ts - Complete file with modifications

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
      'Your account has been deleted. Please contact support'
    );
  }
};
const createUser = async (userData: TUser) => {
  // as we know userData er companyId need to provide here .

  if (userData.companyId == null) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company Id is required');
  }

  if (userData.role == 'projectSupervisor') {
    if (userData.superVisorsManagerId == null) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'SuperVisor Manager Id is required'
      );
    }
  } else {
    userData.superVisorsManagerId = null;
  }
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else {
      await User.findOneAndUpdate({ email: userData.email }, userData);

      //create verification email token
      const verificationToken = await TokenService.createVerifyEmailToken(
        existingUser
      );
      //create verification email otp
      const { otp } = await OtpService.createVerificationEmailOtp(
        existingUser.email
      );
      console.log('OTP ::: FIXME 🟢🟢', otp);
      return { otp, verificationToken }; // FIXME  : otp remove korte hobe ekhan theke ..
    }
  }

  console.log('password before hash 🟢🟢', userData.password);

  // hash password
  userData.password = await bcrypt.hash(userData.password, 12);

  console.log('password after hash 🟢🟢', userData.password);

  const user = await User.create(userData);

  //  company create for project manager

  // check  userData.companyId valid  or not
  const company = await Company.findById(userData.companyId);
  if (!company) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company Name is not valid');
  }

  // add to userCompany collection
  const userCompany = await UserCompany.create({
    userId: user._id,
    companyId: userData.companyId,
    role: userData.role,
  });

  if (!userCompany) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User Company is not created');
  }

  // cantunderstand :
  //create verification email token
  const verificationToken = await TokenService.createVerifyEmailToken(user);
  //create verification email otp
  const { otp } = await OtpService.createVerificationEmailOtp(user.email);
  console.log('OTP ::: FIXME 🟢🟢', otp);
  return { otp, user, verificationToken }; // FIXME  : otp remove korte hobe ekhan theke ..
};

// ========================================================================
// THIS IS THE ONLY FUNCTION THAT HAS BEEN MODIFIED
// ========================================================================
const login = async (email: string, reqpassword: string, fcmToken: string) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.isEmailVerified === false) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User not verified, Please verify your email, Check your email.'
    );
  }

  validateUserStatus(user);

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Account is locked. Try again after ${config.auth.lockTime} minutes`
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
        `Account locked for ${config.auth.lockTime} minutes due to too many failed attempts`
      );
    }

    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  // NEW: We add this line to check if the user belongs to a company.
  const userCompany = await UserCompany.findOne({ userId: user._id });

  const tokens = await TokenService.accessAndRefreshToken(user);

  if (fcmToken) {
    user.fcmToken = fcmToken;
    await user.save(); // INFO :  here fcmToken is saved
  }

  const { password, ...userWithoutPassword } = user.toObject();

  // MODIFIED: We add the isSetupComplete flag to the final return object.
  return {
    userWithoutPassword,
    tokens,
    isSetupComplete: userCompany ? true : false, // This will be true if a record was found, false otherwise.
  };
};
// ========================================================================
// END OF MODIFIED FUNCTION
// ========================================================================


const verifyEmail = async (email: string, token: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  await TokenService.verifyToken(
    token,
    config.token.TokenSecret,
    user?.isResetPassword ? TokenType.RESET_PASSWORD : TokenType.VERIFY
  );

  //verify otp
  await OtpService.verifyOTP(
    user.email,
    otp,
    user?.isResetPassword ? OtpType.RESET_PASSWORD : OtpType.VERIFY
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
  //create reset password token
  const resetPasswordToken = await TokenService.createResetPasswordToken(user);
  const otp = await OtpService.createResetPasswordOtp(user.email);
  user.isResetPassword = true;
  await user.save();
  return { resetPasswordToken, otp }; // FIXME :  otp remove kore dite hobe must ..
};

const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user?.isResetPassword) {
    const resetPasswordToken = await TokenService.createResetPasswordToken(
      user
    );
    const otp = await OtpService.createResetPasswordOtp(user.email);
    return { resetPasswordToken, otp }; // FIXME  :  otp remove korte hobe ..
  }
  const verificationToken = await TokenService.createVerifyEmailToken(user);
  const otp = await OtpService.createVerificationEmailOtp(user.email);
  return { verificationToken, otp }; // FIXME  :  otp remove korte hobe ..
};

const resetPassword = async (
  email: string,
  newPassword: string,
  otp: string
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isOtpVerified = await OtpService.checkOTP(otp);

  if (!isOtpVerified) {
    return null;
  }

  user.password = newPassword;
  user.isResetPassword = false;
  await user.save();
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
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
    TokenType.REFRESH
  );

  console.log('verify User :: 🧑‍💻🟢', verifyUser);
  let tokens;
  if (verifyUser) {
    tokens = await TokenService.accessAndRefreshTokenForRefreshToken(
      verifyUser
    );
  }

  return tokens;
};

export const AuthService = {
  createUser,
  login,
  verifyEmail,
  resetPassword,
  forgotPassword,
  resendOtp,
  logout,
  changePassword,
  refreshAuth,
};