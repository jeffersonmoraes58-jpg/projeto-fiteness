-- Migration: 5_challenges_marketplace
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "coverUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "trainerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_challenges_trainer'
  ) THEN
    ALTER TABLE challenges
      ADD CONSTRAINT fk_challenges_trainer
      FOREIGN KEY ("trainerId") REFERENCES trainers(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE student_challenges
  ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid(),
  '5_challenges_marketplace',
  NOW(),
  '5_challenges_marketplace',
  NULL, NULL, NOW(), 1
) ON CONFLICT DO NOTHING;
