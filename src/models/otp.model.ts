import { db } from "../db/db.js";
import { otps, Otp } from "../db/schema.js";
import { eq, and, gt, desc } from "drizzle-orm";

export const createOtp = async (data: {
  userId?: string | null;
  type: string;
  target: string;
  code: string;
  expiresAt: Date;
}): Promise<Otp> => {
  const [newOtp] = await db
    .insert(otps)
    .values({
      userId: data.userId || null,
      type: data.type,
      target: data.target,
      code: data.code,
      expiresAt: data.expiresAt,
    })
    .returning();
  return newOtp;
};

export const findValidOtp = async (
  target: string,
  type: string,
  code: string
): Promise<Otp | undefined> => {
  const [validOtp] = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.target, target),
        eq(otps.type, type),
        eq(otps.code, code),
        eq(otps.used, false),
        gt(otps.expiresAt, new Date())
      )
    )
    .orderBy(desc(otps.createdAt))
    .limit(1);

  return validOtp;
};

export const markOtpAsUsed = async (id: string): Promise<void> => {
  await db.update(otps).set({ used: true }).where(eq(otps.id, id));
};
