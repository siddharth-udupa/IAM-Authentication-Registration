import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as userModel from "../models/user.model.js";
import * as sessionModel from "../models/session.model.js";
import * as otpModel from "../models/otp.model.js";
import { AuthenticatedRequest, JWT_SECRET } from "../middleware/auth.js";

// Helper function to sanitize user object (strip passwordHash)
function sanitizeUser(user: any) {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

// Cookie configuration options
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
};

// 1. POST /api/register
export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, phone, mfa_enabled } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await userModel.createUser({
      email,
      passwordHash,
      phone,
      mfaEnabled: mfa_enabled,
    });

    // Generate Email OTP challenge (purpose: registration_email)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const challenge = await otpModel.createOtpChallenge({
      userId: newUser.id,
      type: "registration_email",
      channel: "email",
      target: email,
      expiresAt,
      maxAttempts: 3,
    });

    // Print simulated email to server console
    console.log(`\n========================================`);
    console.log(`[SIMULATED EMAIL - REGISTRATION]`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${challenge.rawCode}`);
    console.log(`Challenge ID: ${challenge.challengeId}`);
    console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
    console.log(`========================================\n`);

    return res.status(201).json({
      status: "EMAIL_VERIFICATION_REQUIRED",
      message: "Registration initiated. Email OTP sent.",
      challengeId: challenge.challengeId,
      method: "email",
      user: sanitizeUser(newUser),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to register user" });
  }
};

// 2. POST /api/send-email-otp
export const sendEmailOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await userModel.findUserByEmail(email);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const challenge = await otpModel.createOtpChallenge({
      userId: user ? user.id : null,
      type: "registration_email",
      channel: "email",
      target: email,
      expiresAt,
      maxAttempts: 3,
    });

    // Console logging simulation
    console.log(`\n========================================`);
    console.log(`[SIMULATED EMAIL - RESEND]`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${challenge.rawCode}`);
    console.log(`Challenge ID: ${challenge.challengeId}`);
    console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
    console.log(`========================================\n`);

    return res.json({
      status: "EMAIL_VERIFICATION_REQUIRED",
      message: "Email OTP sent successfully",
      challengeId: challenge.challengeId,
      method: "email",
      target: email,
      expiresAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to send email OTP" });
  }
};

// 3. POST /api/verify-email-otp
export const verifyEmailOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { challengeId, email, code } = req.body;
    if (!code || (!challengeId && !email)) {
      return res.status(400).json({ error: "Code and challengeId or email are required" });
    }

    const result = await otpModel.verifyOtpChallenge({
      challengeId,
      target: email,
      type: "registration_email",
      code,
    });

    if (result.status === "wrong_code") {
      return res.status(400).json({
        status: "INVALID_OTP",
        error: "Invalid verification code",
        attemptsRemaining: result.attemptsLeft,
      });
    }

    if (result.status === "expired") {
      return res.status(400).json({
        status: "OTP_EXPIRED",
        error: "This code has expired. Request a new code.",
      });
    }

    if (result.status === "max_attempts_exceeded") {
      return res.status(400).json({
        status: "MAX_ATTEMPTS_EXCEEDED",
        error: "Too many incorrect attempts. This verification challenge has expired. Request a new code.",
        attemptsRemaining: 0,
      });
    }

    if (result.status !== "valid") {
      return res.status(400).json({ status: "INVALID_OTP", error: "Invalid or expired OTP challenge" });
    }

    // Email verification successful
    const user = await userModel.findUserByEmail(email || result.otp?.target || "");
    if (user) {
      await userModel.markEmailVerified(user.id);
    }

    // Check if SMS verification / MFA step is required next
    if (user && (user.phone || user.mfaEnabled)) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const phoneTarget = user.phone || "SMS Device";

      const smsChallenge = await otpModel.createOtpChallenge({
        userId: user.id,
        type: "registration_sms",
        channel: "sms",
        target: phoneTarget,
        expiresAt,
        maxAttempts: 3,
      });

      console.log(`\n========================================`);
      console.log(`[SIMULATED SMS - REGISTRATION]`);
      console.log(`To: ${phoneTarget}`);
      console.log(`OTP: ${smsChallenge.rawCode}`);
      console.log(`Challenge ID: ${smsChallenge.challengeId}`);
      console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
      console.log(`========================================\n`);

      return res.json({
        status: "SMS_VERIFICATION_REQUIRED",
        message: "Email verified successfully. SMS OTP sent.",
        emailVerified: true,
        nextStep: "sms_otp",
        challengeId: smsChallenge.challengeId,
        method: "sms",
        phone: phoneTarget,
      });
    }

    return res.json({
      status: "EMAIL_VERIFIED",
      message: "Email verified successfully",
      emailVerified: true,
      registrationComplete: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to verify email OTP" });
  }
};

// 4. POST /api/send-sms-otp
export const sendSmsOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const user = await userModel.findUserByPhone(phone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const challenge = await otpModel.createOtpChallenge({
      userId: user ? user.id : null,
      type: "registration_sms",
      channel: "sms",
      target: phone,
      expiresAt,
      maxAttempts: 3,
    });

    console.log(`\n========================================`);
    console.log(`[SIMULATED SMS - RESEND]`);
    console.log(`To: ${phone}`);
    console.log(`OTP: ${challenge.rawCode}`);
    console.log(`Challenge ID: ${challenge.challengeId}`);
    console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
    console.log(`========================================\n`);

    return res.json({
      status: "SMS_VERIFICATION_REQUIRED",
      message: "SMS OTP sent successfully",
      challengeId: challenge.challengeId,
      method: "sms",
      target: phone,
      expiresAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to send SMS OTP" });
  }
};

// 5. POST /api/verify-sms-otp
export const verifySmsOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { challengeId, phone, code } = req.body;
    if (!code || (!challengeId && !phone)) {
      return res.status(400).json({ error: "Code and challengeId or phone are required" });
    }

    const result = await otpModel.verifyOtpChallenge({
      challengeId,
      target: phone,
      type: "registration_sms",
      code,
    });

    if (result.status === "wrong_code") {
      return res.status(400).json({
        status: "INVALID_OTP",
        error: "Invalid SMS OTP code",
        attemptsRemaining: result.attemptsLeft,
      });
    }

    if (result.status === "expired") {
      return res.status(400).json({
        status: "OTP_EXPIRED",
        error: "SMS OTP code has expired. Request a new code.",
      });
    }

    if (result.status === "max_attempts_exceeded") {
      return res.status(400).json({
        status: "MAX_ATTEMPTS_EXCEEDED",
        error: "Too many incorrect attempts. SMS verification challenge expired. Request a new code.",
        attemptsRemaining: 0,
      });
    }

    if (result.status !== "valid") {
      return res.status(400).json({ status: "INVALID_OTP", error: "Invalid or expired SMS OTP challenge" });
    }

    const user = await userModel.findUserByPhone(phone || result.otp?.target || "");
    if (user) {
      await userModel.markPhoneVerified(user.id);
      await userModel.updateMfaStatus(user.id, true);
    }

    return res.json({
      status: "REGISTRATION_COMPLETE",
      message: "Phone verified and MFA enabled successfully!",
      phoneVerified: true,
      mfaEnabled: true,
      registrationComplete: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to verify SMS OTP" });
  }
};

// 6. POST /api/login
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check account lockout
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const remainingMins = Math.ceil(
        (new Date(user.lockoutUntil).getTime() - Date.now()) / (1000 * 60)
      );
      return res.status(423).json({
        error: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMins} minute(s).`,
        locked: true,
        lockoutUntil: user.lockoutUntil,
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const attempts = await userModel.incrementFailedLoginAttempts(user);
      if (attempts >= 5) {
        return res.status(423).json({
          error: "Account locked for 15 minutes due to 5 consecutive failed login attempts.",
          locked: true,
        });
      }
      return res.status(401).json({
        error: `Invalid email or password. Attempt ${attempts} of 5 before account lockout.`,
        attemptsLeft: 5 - attempts,
      });
    }

    // Password valid -> Reset failed login counter
    await userModel.resetFailedLoginAttempts(user.id);

    // If user has MFA enabled -> generate MFA OTP challenge
    if (user.mfaEnabled) {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      const challenge = await otpModel.createOtpChallenge({
        userId: user.id,
        type: "login_mfa",
        channel: "email",
        target: email,
        expiresAt,
        maxAttempts: 3,
      });

      console.log(`\n========================================`);
      console.log(`[SIMULATED EMAIL - LOGIN MFA]`);
      console.log(`To: ${email}`);
      console.log(`OTP: ${challenge.rawCode}`);
      console.log(`Challenge ID: ${challenge.challengeId}`);
      console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
      console.log(`========================================\n`);

      return res.json({
        mfaRequired: true,
        status: "MFA_REQUIRED",
        method: "email",
        challengeId: challenge.challengeId,
        target: email,
        message: "MFA required. Code sent to your email.",
      });
    }

    // Standard Login success (no MFA required)
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newSession = await sessionModel.createSession(user.id, sessionExpiresAt);

    const accessToken = jwt.sign(
      { userId: user.id, sessionId: newSession.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: newSession.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("sessionId", newSession.id, cookieOptions);

    return res.json({
      message: "Login successful",
      mfaRequired: false,
      accessToken,
      refreshToken,
      session: newSession,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to log in" });
  }
};

// 7. POST /api/verify-login-otp
export const verifyLoginOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { challengeId, email, code } = req.body;
    if (!code || (!challengeId && !email)) {
      return res.status(400).json({ error: "Code and challengeId or email are required" });
    }

    const result = await otpModel.verifyOtpChallenge({
      challengeId,
      target: email,
      type: "login_mfa",
      code,
    });

    if (result.status === "wrong_code") {
      return res.status(400).json({
        status: "INVALID_OTP",
        error: "Invalid MFA verification code",
        attemptsRemaining: result.attemptsLeft,
      });
    }

    if (result.status === "expired") {
      return res.status(400).json({
        status: "OTP_EXPIRED",
        error: "MFA code has expired. Please log in again to receive a new code.",
      });
    }

    if (result.status === "max_attempts_exceeded") {
      return res.status(400).json({
        status: "MAX_ATTEMPTS_EXCEEDED",
        error: "Maximum verification attempts reached. This challenge has expired.",
        attemptsRemaining: 0,
      });
    }

    if (result.status !== "valid") {
      return res.status(400).json({ status: "INVALID_OTP", error: "Invalid or expired MFA challenge" });
    }

    const targetEmail = email || result.otp?.target || "";
    const user = await userModel.findUserByEmail(targetEmail);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newSession = await sessionModel.createSession(user.id, sessionExpiresAt);

    const accessToken = jwt.sign(
      { userId: user.id, sessionId: newSession.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: newSession.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("sessionId", newSession.id, cookieOptions);

    return res.json({
      message: "MFA login verified successfully",
      accessToken,
      refreshToken,
      session: newSession,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to verify MFA OTP" });
  }
};

// 8. GET /api/me
export const getMe = (req: AuthenticatedRequest, res: Response): any => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ user: sanitizeUser(req.user), sessionId: req.sessionId });
};

// 9. POST /api/logout
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const sessionId = req.body?.sessionId || req.sessionId || req.cookies?.sessionId;
    if (sessionId) {
      await sessionModel.deleteSessionById(sessionId);
    }
    res.clearCookie("accessToken");
    res.clearCookie("sessionId");
    return res.json({ message: "Logout successful" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Logout failed" });
  }
};

// 10. POST /api/token
export const refreshToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken: token, sessionId } = req.body;
    let targetSessionId = sessionId;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId?: string };
        targetSessionId = targetSessionId || decoded.sessionId;
      } catch {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }
    }

    if (!targetSessionId) {
      return res.status(400).json({ error: "Session ID or refresh token required" });
    }

    const activeSession = await sessionModel.findSessionById(targetSessionId);
    if (!activeSession || new Date(activeSession.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    const user = await userModel.findUserById(activeSession.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, sessionId: activeSession.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Token refresh failed" });
  }
};

// 11. GET /api/protected
export const getProtected = (req: AuthenticatedRequest, res: Response): any => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({
    message: "Access granted to protected endpoint",
    user: sanitizeUser(req.user),
    sessionId: req.sessionId,
  });
};
