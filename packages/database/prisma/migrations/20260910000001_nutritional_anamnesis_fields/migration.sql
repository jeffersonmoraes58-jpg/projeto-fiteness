-- Campos de anamnese nutricional adicionados à tabela anamnesis.
-- Todos nullable — migration segura (ADD COLUMN sem default obrigatório).

ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "mealsPerDay" INTEGER;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "mealSchedule" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "waterIntakeLiters" DOUBLE PRECISION;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "appetite" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "chewing" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "foodAllergies" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "foodIntolerances" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "foodDislikes" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "dietaryPattern" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "supplementsInUse" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "bowelFunction" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "sugarIntake" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "processedFoodIntake" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "whoCooksMeals" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "eatsOutFrequency" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "chronicDiseases" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "familyHistory" TEXT;
ALTER TABLE "anamnesis" ADD COLUMN IF NOT EXISTS "medicationsInUse" TEXT;
