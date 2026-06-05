-- CreateEnum
CREATE TYPE "CareType" AS ENUM ('DEEP_CLEANING', 'POLISHING', 'GLOSS_CARE', 'ANNUAL_CARE', 'ROUTINE_CLEANING', 'CERTIFICATION');

-- CreateTable
CREATE TABLE "JewelryBoxItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "displayName" TEXT NOT NULL,
    "gemType" TEXT,
    "metalType" TEXT,
    "priceCents" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "wearCount" INTEGER NOT NULL DEFAULT 0,
    "lastCareAt" TIMESTAMP(3),
    "nextCareAt" TIMESTAMP(3),
    "story" TEXT,
    "badges" JSONB,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JewelryBoxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareReminder" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jewelryBoxItemId" TEXT,
    "type" "CareType" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckySignRecord" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fortuneId" TEXT NOT NULL,
    "fortune" JSONB NOT NULL,
    "day" TEXT NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LuckySignRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JewelryBoxItem_customerId_idx" ON "JewelryBoxItem"("customerId");
CREATE INDEX "JewelryBoxItem_productId_idx" ON "JewelryBoxItem"("productId");
CREATE INDEX "JewelryBoxItem_nextCareAt_idx" ON "JewelryBoxItem"("nextCareAt");

-- CreateIndex
CREATE INDEX "CareReminder_customerId_idx" ON "CareReminder"("customerId");
CREATE INDEX "CareReminder_jewelryBoxItemId_idx" ON "CareReminder"("jewelryBoxItemId");
CREATE INDEX "CareReminder_scheduledDate_idx" ON "CareReminder"("scheduledDate");
CREATE INDEX "CareReminder_status_scheduledDate_idx" ON "CareReminder"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "LuckySignRecord_customerId_idx" ON "LuckySignRecord"("customerId");
CREATE INDEX "LuckySignRecord_day_idx" ON "LuckySignRecord"("day");
CREATE UNIQUE INDEX "LuckySignRecord_customerId_day_key" ON "LuckySignRecord"("customerId", "day");

-- AddForeignKey
ALTER TABLE "JewelryBoxItem" ADD CONSTRAINT "JewelryBoxItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JewelryBoxItem" ADD CONSTRAINT "JewelryBoxItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReminder" ADD CONSTRAINT "CareReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareReminder" ADD CONSTRAINT "CareReminder_jewelryBoxItemId_fkey" FOREIGN KEY ("jewelryBoxItemId") REFERENCES "JewelryBoxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LuckySignRecord" ADD CONSTRAINT "LuckySignRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
