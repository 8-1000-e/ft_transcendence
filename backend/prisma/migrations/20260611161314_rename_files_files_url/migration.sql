/*
  Warnings:

  - You are about to drop the column `files` on the `GroupChat` table. All the data in the column will be lost.
  - You are about to drop the column `files` on the `ProjectsChat` table. All the data in the column will be lost.
  - You are about to drop the column `files` on the `ProjectsPost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupChat" DROP COLUMN "files",
ADD COLUMN     "filesUrl" TEXT[];

-- AlterTable
ALTER TABLE "ProjectsChat" DROP COLUMN "files",
ADD COLUMN     "filesUrl" TEXT[];

-- AlterTable
ALTER TABLE "ProjectsPost" DROP COLUMN "files",
ADD COLUMN     "filesUrl" TEXT[];
