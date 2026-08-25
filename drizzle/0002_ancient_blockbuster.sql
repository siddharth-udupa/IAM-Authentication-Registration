ALTER TABLE "otps" ADD COLUMN "challenge_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "channel" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lockout_until" timestamp with time zone;