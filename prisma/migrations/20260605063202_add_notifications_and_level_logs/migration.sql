-- CreateEnum: 通知类型（会员升级、优惠券到期、保养提醒、生日奖励、促销、系统）
CREATE TYPE "NotificationType" AS ENUM ('MEMBER_LEVEL_UPGRADED', 'MEMBER_LEVEL_DOWNGRADED', 'COUPON_EXPIRING', 'CARE_REMINDER', 'BIRTHDAY_BONUS', 'PROMOTION', 'SYSTEM');

-- CreateEnum: 等级变更方向
CREATE TYPE "LevelChangeDirection" AS ENUM ('UPGRADE', 'DOWNGRADE', 'INITIAL');

-- AlterEnum: 在 EventType 枚举中添加会员升级/降级事件
ALTER TYPE "EventType" ADD VALUE 'MEMBER_LEVEL_UPGRADED';
ALTER TYPE "EventType" ADD VALUE 'MEMBER_LEVEL_DOWNGRADED';

-- CreateTable: 通知表（用于应用内通知推送）
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "actionUrl" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 会员等级变更历史记录表（审计与分析用）
CREATE TABLE "MemberLevelLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fromLevel" "MemberLevel",
    "toLevel" "MemberLevel" NOT NULL,
    "direction" "LevelChangeDirection" NOT NULL,
    "triggerPointsBalance" INTEGER NOT NULL,
    "triggerPointsTransactionId" TEXT,
    "fromPoints" INTEGER NOT NULL,
    "toPoints" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLevelLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_customerId_createdAt_idx" ON "Notification"("customerId", "createdAt");
CREATE INDEX "Notification_customerId_readAt_idx" ON "Notification"("customerId", "readAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
CREATE INDEX "MemberLevelLog_customerId_createdAt_idx" ON "MemberLevelLog"("customerId", "createdAt");
CREATE INDEX "MemberLevelLog_fromLevel_toLevel_idx" ON "MemberLevelLog"("fromLevel", "toLevel");
CREATE INDEX "MemberLevelLog_direction_idx" ON "MemberLevelLog"("direction");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberLevelLog" ADD CONSTRAINT "MemberLevelLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
