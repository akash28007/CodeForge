-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "editorial" TEXT;

-- CreateTable
CREATE TABLE "EditorialView" (
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialView_pkey" PRIMARY KEY ("userId","problemId")
);

-- AddForeignKey
ALTER TABLE "EditorialView" ADD CONSTRAINT "EditorialView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialView" ADD CONSTRAINT "EditorialView_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
