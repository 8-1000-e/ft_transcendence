/*
  Warnings:

  - You are about to drop the column `isVerified` on the `PendingRegistration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PendingRegistration" DROP COLUMN "isVerified";
