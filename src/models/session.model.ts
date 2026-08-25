import { db } from "../db/db.js";
import { sessions, Session } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const createSession = async (userId: string, expiresAt: Date): Promise<Session> => {
  const [newSession] = await db
    .insert(sessions)
    .values({
      userId,
      expiresAt,
    })
    .returning();
  return newSession;
};

export const findSessionById = async (id: string): Promise<Session | undefined> => {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return session;
};

export const deleteSessionById = async (id: string): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.id, id));
};
