import { db } from "../db/db.js";
import { otps, Otp } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

export interface VerificationResult {
  status: "valid" | "wrong_code" | "expired" | "max_attempts_exceeded" | "invalid";
  attemptsLeft?: number;
  otp?: Otp;
}

export const createOtpChallenge = async (data: {
  userId?: string | null;
  type: string;
  channel: "email" | "sms";
  target: string;
  code: string;
  expiresAt: Date;
  maxAttempts?: number;
}): Promise<{ otp: Otp; rawCode: string; challengeId: string }> => {
  const challengeId = crypto.randomUUID();
  const maxAttempts = data.maxAttempts || 3;

  const [newOtp] = await db
    .insert(otps)
    .values({
      challengeId,
      userId: data.userId || null,
      type: data.type,
      channel: data.channel,
      target: data.target,
      code: data.code,
      expiresAt: data.expiresAt,
      attempts: 0,
      maxAttempts,
      used: false,
    })
    .returning();

  return { otp: newOtp, rawCode: data.code, challengeId };
};

export const verifyOtpChallenge = async (params: {
  challengeId?: string;
  target?: string;
  type: string;
  code: string;
}): Promise<VerificationResult> => {
  let query = db.select().from(otps);

  if (params.challengeId) {
    query = query.where(and(eq(otps.challengeId, params.challengeId), eq(otps.type, params.type))) as typeof query;
  } else if (params.target) {
    query = query.where(and(eq(otps.target, params.target), eq(otps.type, params.type))) as typeof query;
  } else {
    return { status: "invalid" };
  }

  const [record] = await query.orderBy(desc(otps.createdAt)).limit(1);

  if (!record || record.used) {
    return { status: "invalid" };
  }

  // Check attempt limit before verifying
  if (record.attempts >= record.maxAttempts) {
    return { status: "max_attempts_exceeded", attemptsLeft: 0, otp: record };
  }

  // Check expiry
  if (new Date(record.expiresAt) < new Date()) {
    return { status: "expired", otp: record };
  }

  // Verify code
  if (record.code !== params.code.trim()) {
    const updatedAttempts = record.attempts + 1;
    await db
      .update(otps)
      .set({ attempts: updatedAttempts })
      .where(eq(otps.id, record.id));

    const attemptsLeft = Math.max(0, record.maxAttempts - updatedAttempts);
    if (updatedAttempts >= record.maxAttempts) {
      return { status: "max_attempts_exceeded", attemptsLeft: 0, otp: record };
    }
    return { status: "wrong_code", attemptsLeft, otp: record };
  }

  // Mark as used on success
  await db
    .update(otps)
    .set({ used: true })
    .where(eq(otps.id, record.id));

  return { status: "valid", otp: record };
};

export const findValidOtp = async (
  target: string,
  type: string,
  code: string
): Promise<Otp | undefined> => {
  const result = await verifyOtpChallenge({ target, type, code });
  return result.status === "valid" ? result.otp : undefined;
};

export const markOtpAsUsed = async (id: string): Promise<void> => {
  await db.update(otps).set({ used: true }).where(eq(otps.id, id));
};

export const createOtp = async (data: {
  userId?: string | null;
  type: string;
  target: string;
  code: string;
  expiresAt: Date;
  channel?: "email" | "sms";
}): Promise<Otp> => {
  const result = await createOtpChallenge({
    userId: data.userId,
    type: data.type,
    channel: data.channel || "email",
    target: data.target,
    code: data.code,
    expiresAt: data.expiresAt,
  });
  return result.otp;
};


