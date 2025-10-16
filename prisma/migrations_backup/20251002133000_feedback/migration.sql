CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Feedback"
  ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
