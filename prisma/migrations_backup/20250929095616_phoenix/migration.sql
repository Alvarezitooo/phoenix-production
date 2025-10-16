-- CreateTable
CREATE TABLE "public"."RiseSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiseSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RiseSession" ADD CONSTRAINT "RiseSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
