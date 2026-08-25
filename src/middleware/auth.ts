import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { findUserById } from "../models/user.model.js";
import { findSessionById } from "../models/session.model.js";
import { User } from "../db/schema.js";

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-auth-key-change-in-prod";

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : (req.cookies?.accessToken || req.cookies?.sessionId);

    if (!token) {
      return res.status(401).json({ error: "Access token or session required" });
    }

    // Try decoding as JWT first
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId?: string };
      const foundUser = await findUserById(decoded.userId);

      if (foundUser) {
        req.user = foundUser;
        req.sessionId = decoded.sessionId;
        return next();
      }
    } catch {
      // Token may be a raw session ID from DB
    }

    // Check sessions table directly using session model
    const activeSession = await findSessionById(token);

    if (!activeSession || new Date(activeSession.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired token/session" });
    }

    const sessionUser = await findUserById(activeSession.userId);

    if (!sessionUser) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = sessionUser;
    req.sessionId = activeSession.id;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Authentication internal error" });
  }
};
