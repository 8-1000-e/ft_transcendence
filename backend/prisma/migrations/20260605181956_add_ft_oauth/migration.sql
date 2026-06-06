/*
  Warnings:

  - A unique constraint covering the columns `[ftId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ftPfpUrl]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ftId" TEXT,
ADD COLUMN     "ftPfpUrl" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_ftId_key" ON "User"("ftId");

-- CreateIndex
CREATE UNIQUE INDEX "User_ftPfpUrl_key" ON "User"("ftPfpUrl");
