import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from '../user/user.validation';
import { AuthValidation } from './auth.validations';
import auth from '../../middlewares/auth';

const router = Router();

router.post(
  '/register',
  validateRequest(UserValidation.createUserValidationSchema),
  AuthController.register,
);

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

router.post(
  '/forgot-password',
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword,
);

router.post('/resend-otp', AuthController.resendOtp);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword,
);

router.post(
  '/set-initial-password',
  auth('common'),
  validateRequest(AuthValidation.setInitialPasswordValidationSchema),
  AuthController.setInitialPassword
);

router.post(
  '/change-password',
  auth('common'),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword,
);

router.post(
  '/verify-email',
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthController.verifyEmail,
);

router.post('/logout', AuthController.logout);

router.post('/refresh-auth', AuthController.refreshToken);

// ✅ NEW SOCIAL LOGIN ROUTES
router.post('/google-login', AuthController.googleLogin);
router.post('/apple-login', AuthController.appleLogin);

export const AuthRoutes = router;