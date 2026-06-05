-- CreateEnum
CREATE TYPE "MemberLevel" AS ENUM ('NEW', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "PointsTransactionType" AS ENUM ('PURCHASE', 'TRY_ON', 'COUPON_ISSUED', 'LUCKY_SIGN', 'GRANTED', 'SPENT', 'BIRTHDAY_BONUS', 'EXPIRED');

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "level" "MemberLevel" NOT NULL DEFAULT 'NEW',
    "growthExp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalSpentCents" INTEGER NOT NULL DEFAULT 0,
    "totalTryOns" INTEGER NOT NULL DEFAULT 0,
    "totalWearCount" INTEGER NOT NULL DEFAULT 0,
    "badgeCount" INTEGER NOT NULL DEFAULT 0,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "maxStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastLuckySignDay" TEXT,
    "levelUpgradedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PointsTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" TEXT,
    "source" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberLevelRule" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "level" "MemberLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "requiredPoints" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayColor" TEXT NOT NULL,
    "displayIcon" TEXT NOT NULL,
    "benefits" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberLevelRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_customerId_key" ON "MemberProfile"("customerId");
CREATE INDEX "MemberProfile_level_idx" ON "MemberProfile"("level");
CREATE INDEX "MemberProfile_points_idx" ON "MemberProfile"("points");
CREATE INDEX "MemberProfile_lastActiveAt_idx" ON "MemberProfile"("lastActiveAt");

-- CreateIndex
CREATE INDEX "PointsTransaction_customerId_idx" ON "PointsTransaction"("customerId");
CREATE INDEX "PointsTransaction_customerId_createdAt_idx" ON "PointsTransaction"("customerId", "createdAt");
CREATE INDEX "PointsTransaction_type_idx" ON "PointsTransaction"("type");
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemberLevelRule_storeId_level_key" ON "MemberLevelRule"("storeId", "level");
CREATE INDEX "MemberLevelRule_storeId_isActive_idx" ON "MemberLevelRule"("storeId", "isActive");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MemberLevelRule" ADD CONSTRAINT "MemberLevelRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
