CREATE TABLE "public"."BetaCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan" "public"."SubscriptionPlan" NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaCoupon_code_key" ON "public"."BetaCoupon"("code");

ALTER TABLE "public"."BetaCoupon"
  ADD CONSTRAINT "BetaCoupon_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
