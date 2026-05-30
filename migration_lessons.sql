-- Migration: 6_challenge_lessons
CREATE TABLE IF NOT EXISTS challenge_lessons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "challengeId" TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'video',
  "contentUrl" TEXT,
  "thumbnailUrl" TEXT,
  duration INTEGER,
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_attachments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "lessonId" TEXT NOT NULL REFERENCES challenge_lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "lessonId" TEXT NOT NULL REFERENCES challenge_lessons(id) ON DELETE CASCADE,
  progress FLOAT NOT NULL DEFAULT 0,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_lesson UNIQUE ("studentId", "lessonId")
);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), '6_challenge_lessons', NOW(), '6_challenge_lessons', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;
