import dotenv from 'dotenv';
dotenv.config();

export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 6730,
  socketPort: process.env.SOCKET || 6730,

  database: {
    mongoUrl:
      process.env.MONGODB_URL || 'mongodb://localhost:27017/mentor-service',
  },

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      '1018b783185a124050d697313a5dc97f4b7e7f66f4fb82bc7f2998303e48604c',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'bc4b3506f99e4254fc3b8382bf135ffec4a4adf043720555dd0849cb51aa5b02',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION_TIME || '5d',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION_TIME || '365d',
  },

  auth: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockTime: parseInt(process.env.LOCK_TIME || '2'),
  },
  token: {
    TokenSecret:
      process.env.TOKEN_SECRET ||
      '065ec2afe73bb1e47454907a56146e5b75ee441af05fe5bb82bdf169a1901d26',
    verifyEmailTokenExpiration:
      process.env.VERIFY_EMAIL_TOKEN_EXPIRATION_TIME || '10m',
    resetPasswordTokenExpiration:
      process.env.RESET_PASSWORD_TOKEN_EXPIRATION_TIME || '5m',
  },

  otp: {
    verifyEmailOtpExpiration: parseInt(
      process.env.VERIFY_EMAIL_OTP_EXPIRATION_TIME || '10',
    ),
    resetPasswordOtpExpiration: parseInt(
      process.env.RESET_PASSWORD_OTP_EXPIRATION_TIME || '5',
    ),
    maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5'),
    attemptWindowMinutes: parseInt(process.env.ATTEMPT_WINDOW_MINUTES || '10'),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    emailFrom: process.env.EMAIL_FROM || '',
  },

  client: {
    url: process.env.CLIENT_URL || 'http://localhost:3000',
  },

  backend: {
    ip: process.env.BACKEND_IP || '10.0.60.220',
    baseUrl: `http://${process.env.BACKEND_IP}:${process.env.PORT}`,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
};
