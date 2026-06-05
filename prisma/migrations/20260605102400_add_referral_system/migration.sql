-- CreateTable
CREATE TABLE "ReferralCard" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "benefits" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "redeemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL,
    "referralCardId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "visitorId" TEXT,
    "visitorName" TEXT,
    "visitorPhone" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCard_shareCode_key" ON "ReferralCard"("shareCode");
CREATE INDEX "ReferralCard_storeId_idx" ON "ReferralCard"("storeId");
CREATE INDEX "ReferralCard_customerId_idx" ON "ReferralCard"("customerId");
CREATE INDEX "ReferralCard_shareCode_idx" ON "ReferralCard"("shareCode");
CREATE INDEX "ReferralCard_status_validUntil_idx" ON "ReferralCard"("status", "validUntil");

-- CreateIndex
CREATE INDEX "ReferralEvent_referralCardId_idx" ON "ReferralEvent"("referralCardId");
CREATE INDEX "ReferralEvent_eventType_idx" ON "ReferralEvent"("eventType");
CREATE INDEX "ReferralEvent_createdAt_idx" ON "ReferralEvent"("createdAt");
CREATE INDEX "ReferralEvent_visitorId_idx" ON "ReferralEvent"("visitorId");

-- AddForeignKey
ALTER TABLE "ReferralCard" ADD CONSTRAINT "ReferralCard_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralCard" ADD CONSTRAINT "ReferralCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralCardId_fkey" FOREIGN KEY ("referralCardId") REFERENCES "ReferralCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
