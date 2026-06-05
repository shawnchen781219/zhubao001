-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('RING', 'NECKLACE', 'EARRING', 'BRACELET', 'PENDANT', 'BROOCH', 'WATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionGrade" AS ENUM ('MINT', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "TradeInAssessment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "brandName" TEXT,
    "purchaseYear" INTEGER,
    "purchasePrice" INTEGER,
    "metalType" TEXT,
    "metalWeightGrams" DOUBLE PRECISION,
    "metalPurity" DOUBLE PRECISION,
    "gemCategory" TEXT,
    "gemCarat" DOUBLE PRECISION,
    "gemColor" TEXT,
    "gemClarity" TEXT,
    "gemCut" TEXT,
    "gemCertificate" TEXT,
    "conditionGrade" "ConditionGrade" NOT NULL,
    "conditionNotes" TEXT,
    "hasReceipt" BOOLEAN NOT NULL DEFAULT false,
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "hasBox" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" INTEGER NOT NULL,
    "metalValue" INTEGER NOT NULL,
    "gemValue" INTEGER NOT NULL,
    "conditionDiscount" INTEGER NOT NULL,
    "ageDiscount" INTEGER NOT NULL,
    "finalEstimate" INTEGER NOT NULL,
    "subsidyAmount" INTEGER NOT NULL,
    "totalCredit" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "marketReference" JSONB,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeInAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeInAssessment_customerId_idx" ON "TradeInAssessment"("customerId");
CREATE INDEX "TradeInAssessment_status_idx" ON "TradeInAssessment"("status");
CREATE INDEX "TradeInAssessment_createdAt_idx" ON "TradeInAssessment"("createdAt");
CREATE INDEX "TradeInAssessment_category_conditionGrade_idx" ON "TradeInAssessment"("category", "conditionGrade");

-- AddForeignKey
ALTER TABLE "TradeInAssessment" ADD CONSTRAINT "TradeInAssessment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
