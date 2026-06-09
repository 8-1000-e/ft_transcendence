/*
  Warnings:

  - You are about to drop the column `description` on the `Projects` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Projects" DROP COLUMN "description",
DROP COLUMN "subject";
