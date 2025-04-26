ALTER TABLE "vercel_tokens" ADD COLUMN "last_deployment" timestamp;--> statement-breakpoint
ALTER TABLE "vercel_tokens" ADD COLUMN "model_provider" text DEFAULT 'openai';--> statement-breakpoint
ALTER TABLE "vercel_tokens" ADD COLUMN "model_name" text DEFAULT 'gpt-4.1-mini';--> statement-breakpoint
ALTER TABLE "vercel_tokens" ADD COLUMN "last_api_key_update" timestamp;--> statement-breakpoint
ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "currentProduct";--> statement-breakpoint
ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "currentPlan";