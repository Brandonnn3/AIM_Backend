export enum OtpType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY = 'verify',
  LOGIN = 'login',
}

interface IOtp {
  userEmail: string;
  otp: string;
  type: OtpType;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  lastAttemptAt?: Date;
}

export default IOtp;
