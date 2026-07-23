-- CreateEnum
-- No new enums needed

-- CreateTable
CREATE TABLE "trainer_student_goals" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'decrease',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_student_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evolution_insights" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trainerId" TEXT,
    "rating" INTEGER,
    "summary" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evolution_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_student_goals_trainerId_studentId_metric_key" ON "trainer_student_goals"("trainerId", "studentId", "metric");

-- AddForeignKey
ALTER TABLE "trainer_student_goals" ADD CONSTRAINT "trainer_student_goals_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_student_goals" ADD CONSTRAINT "trainer_student_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_insights" ADD CONSTRAINT "evolution_insights_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_insights" ADD CONSTRAINT "evolution_insights_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
