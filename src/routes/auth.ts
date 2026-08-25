import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  signupRateLimiter,
  loginRateLimiter,
  otpResendRateLimiter,
  otpVerifyRateLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

// Endpoint route definitions with server-side rate limiting & lockout protection
router.post("/register", signupRateLimiter, authController.register);
router.post("/send-email-otp", otpResendRateLimiter, authController.sendEmailOtp);
router.post("/verify-email-otp", otpVerifyRateLimiter, authController.verifyEmailOtp);
router.post("/send-sms-otp", otpResendRateLimiter, authController.sendSmsOtp);
router.post("/verify-sms-otp", otpVerifyRateLimiter, authController.verifySmsOtp);
router.post("/login", loginRateLimiter, authController.login);
router.post("/verify-login-otp", otpVerifyRateLimiter, authController.verifyLoginOtp);

router.get("/me", authenticateToken, authController.getMe);
router.post("/logout", authenticateToken, authController.logout);
router.post("/token", authController.refreshToken);
router.get("/protected", authenticateToken, authController.getProtected);

export default router;
