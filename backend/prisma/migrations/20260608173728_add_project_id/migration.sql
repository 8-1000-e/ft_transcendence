/*
  Warnings:

  - Added the required column `projectId` to the `ProjectGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectGroup" ADD COLUMN     "projectId" TEXT NOT NULL;
