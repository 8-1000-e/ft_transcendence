/*
  Warnings:

  - Made the column `verifCode` on table `PendingRegistration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `verifCodeExpiresAt` on table `PendingRegistration` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PendingRegistration" ALTER COLUMN "verifCode" SET NOT NULL,
ALTER COLUMN "verifCodeExpiresAt" SET NOT NULL;
