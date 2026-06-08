/*
  Warnings:

  - You are about to drop the `_ProjectGroupToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProjectGroupToUser" DROP CONSTRAINT "_ProjectGroupToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectGroupToUser" DROP CONSTRAINT "_ProjectGroupToUser_B_fkey";

-- AlterTable
ALTER TABLE "ProjectGroup" ADD COLUMN     "usersId" TEXT[];

-- DropTable
DROP TABLE "_ProjectGroupToUser";
