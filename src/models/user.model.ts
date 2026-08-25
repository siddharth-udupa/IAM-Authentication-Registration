import { db } from "../db/db.js";
import { users, User } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
};

export const findUserByPhone = async (phone: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return user;
};

export const findUserById = async (id: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
};

export const createUser = async (data: {
  email: string;
  passwordHash: string;
  phone?: string | null;
  mfaEnabled?: boolean;
}): Promise<User> => {
  const [newUser] = await db
    .insert(users)
    .values({
      email: data.email,
      passwordHash: data.passwordHash,
      phone: data.phone || null,
      mfaEnabled: Boolean(data.mfaEnabled),
    })
    .returning();
  return newUser;
};

export const markEmailVerified = async (userId: string): Promise<void> => {
  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export const markPhoneVerified = async (userId: string): Promise<void> => {
  await db
    .update(users)
    .set({ phoneVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export const updateMfaStatus = async (userId: string, enabled: boolean): Promise<void> => {
  await db
    .update(users)
    .set({ mfaEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export const incrementFailedLoginAttempts = async (user: User): Promise<number> => {
  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates: Partial<User> = { failedLoginAttempts: newAttempts, updatedAt: new Date() };

  // Lock out account for 15 minutes after 5 failed attempts
  if (newAttempts >= 5) {
    updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await db.update(users).set(updates).where(eq(users.id, user.id));
  return newAttempts;
};

export const resetFailedLoginAttempts = async (userId: string): Promise<void> => {
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockoutUntil: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

