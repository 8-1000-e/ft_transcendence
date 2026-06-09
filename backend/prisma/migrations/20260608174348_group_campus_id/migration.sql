/*
  Warnings:

  - You are about to drop the column `groupProject` on the `ProjectGroup` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `ProjectGroup` table. All the data in the column will be lost.
  - Added the required column `groupProjectId` to the `ProjectGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectGroup" DROP COLUMN "groupProject",
DROP COLUMN "projectId",
ADD COLUMN     "groupProjectId" TEXT NOT NULL;
