import { pgTable, uuid, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import crypto from "crypto";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockoutUntil: timestamp("lockout_until", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const otps = pgTable("otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeId: text("challenge_id")
    .$defaultFn(() => crypto.randomUUID())
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'email_verify' | 'phone_verify' | 'login_mfa'
  channel: text("channel").default("email").notNull(), // 'email' | 'sms'
  target: text("target").notNull(), // email address or phone number
  otpHash: text("otp_hash").notNull(), // bcrypt hash of the 6-digit OTP code
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  used: boolean("used").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;
