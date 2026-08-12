-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "dayOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
