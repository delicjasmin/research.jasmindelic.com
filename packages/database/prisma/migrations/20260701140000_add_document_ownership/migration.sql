-- Existing documents have no owner; clear them before requiring userId.
DELETE FROM "Document";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "fileSizeBytes" INTEGER,
ADD COLUMN "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "user" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
