-- Add feeling field to body_measurements for quick check-in mood tracking (1-10 scale)
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "feeling" INTEGER;
