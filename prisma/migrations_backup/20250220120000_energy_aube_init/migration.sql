-- CreateEnum
CREATE TYPE "EnergyTransactionType" AS ENUM ('PURCHASE', 'SPEND', 'BONUS', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "JournalPortal" AS ENUM ('AUBE', 'LETTER', 'RISE', 'CV', 'RITUAL');

-- CreateTable
CREATE TABLE "EnergyWallet" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastEnergyActionAt" TIMESTAMP(3),
    "lastBonusAwardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyWallet_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "EnergyWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnergyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EnergyTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnergyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AubeProfile" (
    "userId" TEXT NOT NULL,
    "forces" TEXT[] NOT NULL,
    "shadow" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "clarityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AubeProfile_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "AubeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portal" "JournalPortal" NOT NULL,
    "promptKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "EnergyTransaction_userId_idx" ON "EnergyTransaction" ("userId");
CREATE INDEX "JournalEntry_userId_portal_idx" ON "JournalEntry" ("userId", "portal");
