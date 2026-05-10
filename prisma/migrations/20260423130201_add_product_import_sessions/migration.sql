-- CreateEnum
CREATE TYPE "ProductImportStatus" AS ENUM ('PREVIEW', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProductImportSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "status" "ProductImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "previewJson" TEXT NOT NULL,
    "summaryJson" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImportSession_storeId_createdAt_idx" ON "ProductImportSession"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductImportSession_userId_createdAt_idx" ON "ProductImportSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductImportSession" ADD CONSTRAINT "ProductImportSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImportSession" ADD CONSTRAINT "ProductImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
