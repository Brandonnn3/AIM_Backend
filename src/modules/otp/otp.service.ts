import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '../../helpers/emailService';
import OTP from './otp.model';
import { config } from '../../config';
import { errorLogger, logger } from '../../shared/logger';

const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const createOTP = async (
  userEmail: string,
  expiresInMinutes: string,
  type: string,
) => {
  const existingOTP = await OTP.findOne({
    userEmail,
    type,
    verified: false,
    expiresAt: { $gt: new Date() },
  });
  if (existingOTP) {
    const windowStart = moment()
      .subtract(config.otp.attemptWindowMinutes, 'minutes')
      .toDate();
    if (
      existingOTP.attempts >= config.otp.maxOtpAttempts &&
      existingOTP.lastAttemptAt &&
      existingOTP.lastAttemptAt > windowStart
    ) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        `Too many attempts. Please try again after ${config.otp.attemptWindowMinutes} minutes`,
      );
    }
  }
  await OTP.deleteMany({ userEmail, type });
  const otp = generateOTP();
  const otpDoc = await OTP.create({
    userEmail,
    otp,
    type,
    expiresAt: moment.utc().add(parseInt(expiresInMinutes), 'minutes').toDate(),
  });
  return otpDoc;
};

const checkOTP = async (otp:string)=> {
  const otpDoc = await OTP.findOne({
    otp,
  });

  if (!otpDoc ) { 
    // || otpDoc.expiresAt < new Date()
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found or expired');
  }

  if(otpDoc.verified){
    return true;
  }
  return false;
}

const verifyOTP = async (userEmail: string, otp: string, type: string) => {
  const otpDoc = await OTP.findOne({
    userEmail,
    type,
    verified: false,
  });

  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found or expired');
  }
  otpDoc.attempts += 1;
  otpDoc.lastAttemptAt = new Date();
  if (otpDoc.attempts > config.otp.maxOtpAttempts) {
    await otpDoc.save();
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many attempts. Please try again after ${config.otp.attemptWindowMinutes} minutes`,
    );
  }
  if (otpDoc.otp !== otp) {
    await otpDoc.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }
  otpDoc.verified = true;
  await otpDoc.save();
  return true;
};

const createVerificationEmailOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.verifyEmailOtpExpiration.toString(),
    'verify',
  );

  // 🚀 Don't block the request on email delivery
  sendVerificationEmail(email, otpDoc.otp)
    .then(() => {
      logger.info(
        `📧 [EMAIL] Verification email queued for ${email} (otp=${otpDoc.otp})`,
      );
    })
    .catch(err => {
      errorLogger.error(
        '📧 [EMAIL ERROR] Failed to send verification email',
        err,
      );
    });

  return otpDoc;
};
const createResetPasswordOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.resetPasswordOtpExpiration.toString(),
    'resetPassword',
  );
  await sendResetPasswordEmail(email, otpDoc.otp);
  return otpDoc;
};

export const OtpService = {
  createOTP,
  verifyOTP,
  createVerificationEmailOtp,
  createResetPasswordOtp,
  checkOTP
};
