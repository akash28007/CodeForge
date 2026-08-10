-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "username" TEXT;

-- CreateIndex
-- Safe on existing rows: `username` is nullable and Postgres treats NULLs as distinct,
-- so every pre-existing user passes the constraint until a handle is assigned.
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
