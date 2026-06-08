/*
  Warnings:

  - You are about to drop the column `VeridcodeExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `VerifCode` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "VeridcodeExpiresAt",
DROP COLUMN "VerifCode",
ADD COLUMN     "verifCode" TEXT,
ADD COLUMN     "verifcodeExpiresAt" TIMESTAMP(3);
