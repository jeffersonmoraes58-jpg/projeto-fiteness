-- AlterTable: adiciona ciclo de faturamento (mensal/anual) à assinatura do tenant
ALTER TABLE "tenant_subscriptions"
  ADD COLUMN "billingCycle" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';
