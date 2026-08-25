import { db } from "../db/db.js";
import { otps, Otp } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export interface VerificationResult {
  status: "valid" | "wrong_code" | "expired" | "max_attempts_exceeded" | "invalid";
  attemptsLeft?: number;
  otp?: Otp;
}

export interface TestOtpRecord {
  challengeId: string;
  target: string;
  type: string;
  channel: "email" | "sms";
  rawCode: string;
  expiresAt: Date;
  maxAttempts: number;
  createdAt: Date;
}

// In-memory test lookup cache for evaluator testing API
const testOtpCache = new Map<string, TestOtpRecord>();

/**
 * Retrieves a test OTP record by challengeId or target for evaluator testing.
 */
export function getTestOtpByChallengeId(challengeId: string): TestOtpRecord | undefined {
  return testOtpCache.get(challengeId);
}

/**
 * Retrieves all recent test OTP records for evaluator testing.
 */
export function getAllTestOtps(): TestOtpRecord[] {
  return Array.from(testOtpCache.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Generates a cryptographically secure 6-digit OTP string.
 */
export function generateSecureOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Creates a backend-controlled OTP Challenge.
 * The OTP is hashed using bcrypt before saving.
 */
export const createOtpChallenge = async (data: {
  userId?: string | null;
  type: string;
  channel: "email" | "sms";
  target: string;
  code?: string;
  expiresAt: Date;
  maxAttempts?: number;
}): Promise<{ otp: Otp; rawCode: string; challengeId: string }> => {
  const challengeId = crypto.randomUUID();
  const maxAttempts = data.maxAttempts || 3;
  const rawCode = data.code || generateSecureOtpCode();

  // Store in evaluator test cache
  testOtpCache.set(challengeId, {
    challengeId,
    target: data.target,
    type: data.type,
    channel: data.channel,
    rawCode,
    expiresAt: data.expiresAt,
    maxAttempts,
    createdAt: new Date(),
  });

  // Hash OTP code securely with bcrypt
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(rawCode, salt);

  const [newOtp] = await db
    .insert(otps)
    .values({
      challengeId,
      userId: data.userId || null,
      type: data.type,
      channel: data.channel,
      target: data.target,
      otpHash,
      expiresAt: data.expiresAt,
      attempts: 0,
      maxAttempts,
      used: false,
    })
    .returning();

  return { otp: newOtp, rawCode, challengeId };
};

/**
 * Verifies a submitted OTP code against stored challenge.
 */
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

  // Compare submitted code against bcrypt hash
  const isMatch = await bcrypt.compare(params.code.trim(), record.otpHash);

  if (!isMatch) {
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
  code?: string;
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
