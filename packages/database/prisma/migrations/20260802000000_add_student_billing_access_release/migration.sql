-- Liberação "na confiança": o trainer libera o acesso do aluno sem alterar o financeiro.
-- As faturas permanecem em aberto; apenas o bloqueio por acesso é suspenso.
ALTER TABLE "student_billings" ADD COLUMN IF NOT EXISTS "accessReleasedAt" TIMESTAMP(3);
ALTER TABLE "student_billings" ADD COLUMN IF NOT EXISTS "accessReleaseNote" TEXT;
