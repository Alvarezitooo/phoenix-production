/*
  Warnings:

  - You are about to drop the column `energyCost` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `energyCost` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `energyCredits` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `CreditPurchase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EnergyTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('ESSENTIAL', 'PRO');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- DropForeignKey
ALTER TABLE "public"."CreditPurchase" DROP CONSTRAINT "CreditPurchase_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EnergyTransaction" DROP CONSTRAINT "EnergyTransaction_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Assessment" DROP COLUMN "energyCost";

-- AlterTable
ALTER TABLE "public"."Conversation" DROP COLUMN "energyCost";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "energyCredits",
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" "public"."SubscriptionPlan" DEFAULT 'ESSENTIAL',
ADD COLUMN     "subscriptionStatus" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE';

-- DropTable
DROP TABLE "public"."CreditPurchase";

-- DropTable
DROP TABLE "public"."EnergyTransaction";

-- DropEnum
DROP TYPE "public"."EnergyReason";
