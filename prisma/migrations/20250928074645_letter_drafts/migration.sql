-- CreateTable
CREATE TABLE "public"."LetterDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "template" TEXT,
    "tone" TEXT,
    "language" TEXT,
    "content" JSONB NOT NULL,
    "alignScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LetterFeedback" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LetterFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."LetterDraft" ADD CONSTRAINT "LetterDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LetterFeedback" ADD CONSTRAINT "LetterFeedback_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."LetterDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
