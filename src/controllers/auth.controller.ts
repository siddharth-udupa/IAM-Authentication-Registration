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

    return res.status(201).json({
      message: "User registered successfully",
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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await otpModel.createOtp({
      userId: user ? user.id : null,
      type: "email_verify",
      target: email,
      code,
      expiresAt,
    });

    return res.json({
      message: "Email OTP sent successfully",
      target: email,
      otp: code,
      expiresAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to send email OTP" });
  }
};

// 3. POST /api/verify-email-otp
export const verifyEmailOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const validOtp = await otpModel.findValidOtp(email, "email_verify", code);
    if (!validOtp) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    await otpModel.markOtpAsUsed(validOtp.id);

    const user = await userModel.findUserByEmail(email);
    if (user) {
      await userModel.markEmailVerified(user.id);
    }

    return res.json({ message: "Email verified successfully" });
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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await otpModel.createOtp({
      userId: user ? user.id : null,
      type: "phone_verify",
      target: phone,
      code,
      expiresAt,
    });

    return res.json({
      message: "SMS OTP sent successfully",
      target: phone,
      otp: code,
      expiresAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to send SMS OTP" });
  }
};

// 5. POST /api/verify-sms-otp
export const verifySmsOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code are required" });
    }

    const validOtp = await otpModel.findValidOtp(phone, "phone_verify", code);
    if (!validOtp) {
      return res.status(400).json({ error: "Invalid or expired SMS OTP code" });
    }

    await otpModel.markOtpAsUsed(validOtp.id);

    const user = await userModel.findUserByPhone(phone);
    if (user) {
      await userModel.markPhoneVerified(user.id);
    }

    return res.json({ message: "Phone verified successfully" });
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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.mfaEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await otpModel.createOtp({
        userId: user.id,
        type: "login_mfa",
        target: email,
        code,
        expiresAt,
      });

      return res.json({
        mfaRequired: true,
        message: "MFA code sent to email",
        target: email,
        otp: code,
      });
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

    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("sessionId", newSession.id, { httpOnly: true });

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
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const validOtp = await otpModel.findValidOtp(email, "login_mfa", code);
    if (!validOtp) {
      return res.status(400).json({ error: "Invalid or expired MFA OTP code" });
    }

    await otpModel.markOtpAsUsed(validOtp.id);

    const user = await userModel.findUserByEmail(email);
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

    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("sessionId", newSession.id, { httpOnly: true });

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
