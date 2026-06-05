-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'ADVISOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'MERGED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CustomerIdentityType" AS ENUM ('WECHAT_OPENID', 'WECHAT_UNIONID', 'PHONE', 'STAFF_CREATED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MIRROR_TERMINAL', 'CUSTOM_PAD', 'ADMIN_TERMINAL', 'DISPLAY_SCREEN');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('NECKLACE', 'EARRING', 'BRACELET', 'RING', 'GEMSTONE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO', 'MODEL_3D', 'CERTIFICATE', 'DESIGN_DRAFT');

-- CreateEnum
CREATE TYPE "GemstoneType" AS ENUM ('NATURAL', 'LAB_DIAMOND', 'LAB_GEMSTONE', 'OTHER');

-- CreateEnum
CREATE TYPE "TryOnSessionStatus" AS ENUM ('ANONYMOUS', 'QR_SHOWN', 'SCANNED', 'AUTHORIZED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO', 'POSTER', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "MediaAuthorizationStatus" AS ENUM ('LOCAL_TEMP_ONLY', 'AUTHORIZED_TO_UPLOAD', 'UPLOADED_PRIVATE', 'AUTHORIZED_TO_SHARE', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "CouponTemplateType" AS ENUM ('FREE_CLEANING', 'GEMSTONE_BLIND_BOX', 'AMOUNT_OFF', 'PERCENT_OFF');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ISSUED', 'LOCKED', 'REDEEMED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DEVICE_REGISTERED', 'DEVICE_HEARTBEAT', 'DEVICE_SUSPENDED', 'CATALOG_SYNCED', 'TRY_ON_STARTED', 'TRY_ON_ITEM_SELECTED', 'TRY_ON_QR_SHOWN', 'TRY_ON_QR_SCANNED', 'TRY_ON_AUTHORIZED', 'TRY_ON_COMPLETED', 'CUSTOMER_AUTHORIZED', 'CUSTOMER_CREATED', 'CUSTOMER_MERGED', 'CUSTOMER_PROFILE_UPDATED', 'MEDIA_AUTHORIZED', 'MEDIA_EXPIRED', 'MEDIA_DELETED', 'COUPON_ISSUED', 'COUPON_REDEEMED', 'COUPON_EXPIRED', 'COUPON_VOIDED', 'STAFF_FOLLOW_UP_CREATED');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phoneHash" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'ADVISOR',
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "displayName" TEXT,
    "phoneHash" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" JSONB,
    "preferences" JSONB,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerIdentity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerIdentityType" NOT NULL,
    "identityHash" TEXT NOT NULL,
    "rawHint" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "secretHash" TEXT NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastSeenIpHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAsset" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gemstone" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "code" TEXT NOT NULL,
    "type" "GemstoneType" NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT,
    "certificateNo" TEXT,
    "storySummary" TEXT,
    "formationProcess" JSONB,
    "inclusions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gemstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryOnSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "customerId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "qrTokenHash" TEXT,
    "status" "TryOnSessionStatus" NOT NULL DEFAULT 'ANONYMOUS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "qrShownAt" TIMESTAMP(3),
    "scannedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TryOnSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryOnItem" (
    "id" TEXT NOT NULL,
    "tryOnSessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "position" TEXT,
    "renderConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TryOnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "tryOnSessionId" TEXT,
    "tryOnItemId" TEXT,
    "type" "MediaType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksumHash" TEXT,
    "authorizationStatus" "MediaAuthorizationStatus" NOT NULL DEFAULT 'LOCAL_TEMP_ONLY',
    "authorizedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponTemplate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CouponTemplateType" NOT NULL,
    "valueCents" INTEGER,
    "percentOff" INTEGER,
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "maxIssueCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "customerId" TEXT,
    "sourceTryOnSessionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedByStaffId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,
    "customerId" TEXT,
    "anonymousId" TEXT,
    "tryOnSessionId" TEXT,
    "createdByStaffId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "StaffUser_storeId_status_idx" ON "StaffUser"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_storeId_email_key" ON "StaffUser"("storeId", "email");

-- CreateIndex
CREATE INDEX "Customer_storeId_status_idx" ON "Customer"("storeId", "status");

-- CreateIndex
CREATE INDEX "Customer_phoneHash_idx" ON "Customer"("phoneHash");

-- CreateIndex
CREATE INDEX "CustomerIdentity_customerId_idx" ON "CustomerIdentity"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIdentity_type_identityHash_key" ON "CustomerIdentity"("type", "identityHash");

-- CreateIndex
CREATE INDEX "Device_storeId_status_idx" ON "Device"("storeId", "status");

-- CreateIndex
CREATE INDEX "Device_type_status_idx" ON "Device"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Device_storeId_code_key" ON "Device"("storeId", "code");

-- CreateIndex
CREATE INDEX "Product_storeId_status_idx" ON "Product"("storeId", "status");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");

-- CreateIndex
CREATE INDEX "ProductAsset_storeId_productId_idx" ON "ProductAsset"("storeId", "productId");

-- CreateIndex
CREATE INDEX "ProductAsset_kind_idx" ON "ProductAsset"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Gemstone_productId_key" ON "Gemstone"("productId");

-- CreateIndex
CREATE INDEX "Gemstone_storeId_type_idx" ON "Gemstone"("storeId", "type");

-- CreateIndex
CREATE INDEX "Gemstone_certificateNo_idx" ON "Gemstone"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Gemstone_storeId_code_key" ON "Gemstone"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "TryOnSession_qrTokenHash_key" ON "TryOnSession"("qrTokenHash");

-- CreateIndex
CREATE INDEX "TryOnSession_storeId_startedAt_idx" ON "TryOnSession"("storeId", "startedAt");

-- CreateIndex
CREATE INDEX "TryOnSession_deviceId_startedAt_idx" ON "TryOnSession"("deviceId", "startedAt");

-- CreateIndex
CREATE INDEX "TryOnSession_customerId_idx" ON "TryOnSession"("customerId");

-- CreateIndex
CREATE INDEX "TryOnSession_anonymousId_idx" ON "TryOnSession"("anonymousId");

-- CreateIndex
CREATE INDEX "TryOnSession_status_idx" ON "TryOnSession"("status");

-- CreateIndex
CREATE INDEX "TryOnItem_tryOnSessionId_idx" ON "TryOnItem"("tryOnSessionId");

-- CreateIndex
CREATE INDEX "TryOnItem_productId_idx" ON "TryOnItem"("productId");

-- CreateIndex
CREATE INDEX "MediaAsset_storeId_createdAt_idx" ON "MediaAsset"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_customerId_idx" ON "MediaAsset"("customerId");

-- CreateIndex
CREATE INDEX "MediaAsset_tryOnSessionId_idx" ON "MediaAsset"("tryOnSessionId");

-- CreateIndex
CREATE INDEX "MediaAsset_authorizationStatus_idx" ON "MediaAsset"("authorizationStatus");

-- CreateIndex
CREATE INDEX "MediaAsset_expiresAt_idx" ON "MediaAsset"("expiresAt");

-- CreateIndex
CREATE INDEX "CouponTemplate_storeId_active_idx" ON "CouponTemplate"("storeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CouponTemplate_storeId_code_key" ON "CouponTemplate"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_idempotencyKey_key" ON "Coupon"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Coupon_storeId_status_idx" ON "Coupon"("storeId", "status");

-- CreateIndex
CREATE INDEX "Coupon_customerId_status_idx" ON "Coupon"("customerId", "status");

-- CreateIndex
CREATE INDEX "Coupon_sourceTryOnSessionId_idx" ON "Coupon"("sourceTryOnSessionId");

-- CreateIndex
CREATE INDEX "Coupon_expiresAt_idx" ON "Coupon"("expiresAt");

-- CreateIndex
CREATE INDEX "EventLog_storeId_eventType_occurredAt_idx" ON "EventLog"("storeId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "EventLog_deviceId_occurredAt_idx" ON "EventLog"("deviceId", "occurredAt");

-- CreateIndex
CREATE INDEX "EventLog_customerId_occurredAt_idx" ON "EventLog"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "EventLog_anonymousId_idx" ON "EventLog"("anonymousId");

-- CreateIndex
CREATE INDEX "EventLog_tryOnSessionId_idx" ON "EventLog"("tryOnSessionId");

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "CustomerIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gemstone" ADD CONSTRAINT "Gemstone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gemstone" ADD CONSTRAINT "Gemstone_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnSession" ADD CONSTRAINT "TryOnSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnSession" ADD CONSTRAINT "TryOnSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnSession" ADD CONSTRAINT "TryOnSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnItem" ADD CONSTRAINT "TryOnItem_tryOnSessionId_fkey" FOREIGN KEY ("tryOnSessionId") REFERENCES "TryOnSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnItem" ADD CONSTRAINT "TryOnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tryOnSessionId_fkey" FOREIGN KEY ("tryOnSessionId") REFERENCES "TryOnSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tryOnItemId_fkey" FOREIGN KEY ("tryOnItemId") REFERENCES "TryOnItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTemplate" ADD CONSTRAINT "CouponTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CouponTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_sourceTryOnSessionId_fkey" FOREIGN KEY ("sourceTryOnSessionId") REFERENCES "TryOnSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_issuedByStaffId_fkey" FOREIGN KEY ("issuedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_tryOnSessionId_fkey" FOREIGN KEY ("tryOnSessionId") REFERENCES "TryOnSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
