-- Add mood field to meal_logs
ALTER TABLE "meal_logs" ADD COLUMN IF NOT EXISTS "mood" TEXT;
