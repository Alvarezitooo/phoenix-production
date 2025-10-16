-- CreateTable
CREATE TABLE "public"."ResumeDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "template" TEXT NOT NULL,
    "tone" TEXT,
    "language" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "context" JSONB,
    "alignScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResumeFeedback" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ResumeDraft" ADD CONSTRAINT "ResumeDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResumeFeedback" ADD CONSTRAINT "ResumeFeedback_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."ResumeDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
