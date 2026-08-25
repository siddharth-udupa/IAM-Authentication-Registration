import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Endpoint route definitions mapping to controller methods
router.post("/register", authController.register);
router.post("/send-email-otp", authController.sendEmailOtp);
router.post("/verify-email-otp", authController.verifyEmailOtp);
router.post("/send-sms-otp", authController.sendSmsOtp);
router.post("/verify-sms-otp", authController.verifySmsOtp);
router.post("/login", authController.login);
router.post("/verify-login-otp", authController.verifyLoginOtp);

router.get("/me", authenticateToken, authController.getMe);
router.post("/logout", authenticateToken, authController.logout);
router.post("/token", authController.refreshToken);
router.get("/protected", authenticateToken, authController.getProtected);

export default router;
