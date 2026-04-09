-- CreateEnum
CREATE TYPE "BillingPlanKey" AS ENUM ('BASIC', 'GROWTH', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "workspaces"
ADD COLUMN "planKey" "BillingPlanKey",
ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_stripeCustomerId_key" ON "workspaces"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_stripeSubscriptionId_key" ON "workspaces"("stripeSubscriptionId");
