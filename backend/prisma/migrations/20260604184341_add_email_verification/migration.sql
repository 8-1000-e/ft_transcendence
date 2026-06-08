/*
  Warnings:

  - You are about to drop the column `verifcodeExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "verifcodeExpiresAt",
ADD COLUMN     "verifCodeExpiresAt" TIMESTAMP(3);
