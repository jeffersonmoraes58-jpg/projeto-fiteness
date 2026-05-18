-- Add new fields to nutritionists table
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "attendanceMode" TEXT;
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "workingHours" JSONB;
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;

-- CreateTable clinical_notes
CREATE TABLE IF NOT EXISTS "clinical_notes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GERAL',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable supplementation_plans
CREATE TABLE IF NOT EXISTS "supplementation_plans" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplementation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable supplementation_plan_items
CREATE TABLE IF NOT EXISTS "supplementation_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "timing" TEXT,
    "notes" TEXT,

    CONSTRAINT "supplementation_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable patient_exams
CREATE TABLE IF NOT EXISTS "patient_exams" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'PDF',
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_exams_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey clinical_notes
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey supplementation_plans
ALTER TABLE "supplementation_plans" ADD CONSTRAINT "supplementation_plans_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplementation_plans" ADD CONSTRAINT "supplementation_plans_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey supplementation_plan_items
ALTER TABLE "supplementation_plan_items" ADD CONSTRAINT "supplementation_plan_items_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "supplementation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey patient_exams
ALTER TABLE "patient_exams" ADD CONSTRAINT "patient_exams_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_exams" ADD CONSTRAINT "patient_exams_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
