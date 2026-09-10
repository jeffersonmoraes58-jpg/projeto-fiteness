-- Item 2: dobras cutâneas + metadados na avaliação física
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldTricepsMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldSubscapularMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldChestMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldMidaxillaryMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldSuprailiacMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldAbdominalMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldThighMm" DOUBLE PRECISION;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "skinfoldProtocol" TEXT;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "assessedAge" INTEGER;
ALTER TABLE "physical_assessments" ADD COLUMN IF NOT EXISTS "assessedGender" TEXT;

-- Item 3: recordatório alimentar 24h
CREATE TABLE IF NOT EXISTS "food_recalls" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nutritionistId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "referenceDate" TEXT,
    "patientNotes" TEXT,
    "nutritionistNotes" TEXT,
    CONSTRAINT "food_recalls_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "food_recalls_studentId_status_idx" ON "food_recalls"("studentId", "status");

CREATE TABLE IF NOT EXISTS "food_recall_meals" (
    "id" TEXT NOT NULL,
    "recallId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "time" TEXT,
    "place" TEXT,
    "name" TEXT NOT NULL,
    "foods" TEXT NOT NULL,
    CONSTRAINT "food_recall_meals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "food_recalls" ADD CONSTRAINT "food_recalls_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_recall_meals" ADD CONSTRAINT "food_recall_meals_recallId_fkey"
    FOREIGN KEY ("recallId") REFERENCES "food_recalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
