import mongoose, { Schema } from 'mongoose';
import IOtp, { OtpType } from './otp.interface';

const otpSchema = new Schema<IOtp>(
  {
    userEmail: {
      type: String,
      required: [true, 'User Email is required'],
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
    },
    type: {
      type: String,
      enum: [
        OtpType.ACCESS,
        OtpType.REFRESH,
        OtpType.RESET_PASSWORD,
        OtpType.VERIFY,
        OtpType.LOGIN,
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const OTP = mongoose.model<IOtp>('OTP', otpSchema);
export default OTP;
