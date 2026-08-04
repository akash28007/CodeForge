-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "passedCount" INTEGER,
ADD COLUMN     "totalCount" INTEGER;
