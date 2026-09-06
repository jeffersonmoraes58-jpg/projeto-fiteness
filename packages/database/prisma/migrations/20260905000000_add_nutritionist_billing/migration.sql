-- Espelha trainer_pricing/student_billings/invoices (ver 4_billing_system)
-- para o par nutricionista <-> paciente. Reaproveita os enums existentes
-- (BillingInterval, StudentBillingStatus, InvoiceStatus).

-- CreateTable: nutritionist_pricing
CREATE TABLE "nutritionist_pricing" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION,
    "annualPrice" DOUBLE PRECISION,
    "mpAccessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nutritionist_pricing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "nutritionist_pricing_nutritionistId_key" ON "nutritionist_pricing"("nutritionistId");

-- CreateTable: patient_billings
CREATE TABLE "patient_billings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "StudentBillingStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "accessReleasedAt" TIMESTAMP(3),
    "accessReleaseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_billings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "patient_billings_studentId_nutritionistId_key" ON "patient_billings"("studentId", "nutritionistId");

-- CreateTable: patient_invoices
CREATE TABLE "patient_invoices" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "mpPaymentId" TEXT,
    "pixQrCode" TEXT,
    "pixQrCodeBase64" TEXT,
    "pixExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_invoices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "nutritionist_pricing" ADD CONSTRAINT "nutritionist_pricing_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_billings" ADD CONSTRAINT "patient_billings_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_billings" ADD CONSTRAINT "patient_billings_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_billingId_fkey"
    FOREIGN KEY ("billingId") REFERENCES "patient_billings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
