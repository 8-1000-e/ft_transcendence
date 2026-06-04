-- AlterTable
ALTER TABLE "User" ADD COLUMN     "VeridcodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "VerifCode" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
