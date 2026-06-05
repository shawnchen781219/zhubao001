-- CreateEnum
CREATE TYPE "BlindBoxRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateTable
CREATE TABLE "BlindBoxPool" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openPrice" INTEGER NOT NULL DEFAULT 0,
    "maxOpensPerDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlindBoxPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindBoxItem" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "productId" TEXT,
    "customName" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "probability" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "totalGiven" INTEGER NOT NULL DEFAULT 0,
    "rarity" "BlindBoxRarity" NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlindBoxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindBoxHistory" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlindBoxHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlindBoxPool_storeId_isActive_idx" ON "BlindBoxPool"("storeId", "isActive");
CREATE INDEX "BlindBoxPool_activeFrom_activeUntil_idx" ON "BlindBoxPool"("activeFrom", "activeUntil");
CREATE INDEX "BlindBoxItem_poolId_idx" ON "BlindBoxItem"("poolId");
CREATE INDEX "BlindBoxHistory_poolId_customerId_idx" ON "BlindBoxHistory"("poolId", "customerId");
CREATE INDEX "BlindBoxHistory_customerId_openedAt_idx" ON "BlindBoxHistory"("customerId", "openedAt");

-- AddForeignKey
ALTER TABLE "BlindBoxPool" ADD CONSTRAINT "BlindBoxPool_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlindBoxItem" ADD CONSTRAINT "BlindBoxItem_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BlindBoxPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlindBoxItem" ADD CONSTRAINT "BlindBoxItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlindBoxHistory" ADD CONSTRAINT "BlindBoxHistory_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BlindBoxPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlindBoxHistory" ADD CONSTRAINT "BlindBoxHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlindBoxHistory" ADD CONSTRAINT "BlindBoxHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "BlindBoxItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
