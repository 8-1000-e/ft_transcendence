/*
  Warnings:

  - Added the required column `rdmCampus` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rdmName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rdmPfp` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rdmCampus" TEXT NOT NULL,
ADD COLUMN     "rdmName" TEXT NOT NULL,
ADD COLUMN     "rdmPfp" TEXT NOT NULL;
