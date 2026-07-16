-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpLastUsedStep" INTEGER,
ADD COLUMN     "totpSecret" TEXT;
