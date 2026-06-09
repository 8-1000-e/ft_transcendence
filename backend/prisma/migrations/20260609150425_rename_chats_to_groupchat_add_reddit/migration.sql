/*
  Warnings:

  - You are about to drop the `GroupChats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GroupChats" DROP CONSTRAINT "GroupChats_group_fkey";

-- DropForeignKey
ALTER TABLE "GroupChats" DROP CONSTRAINT "GroupChats_sender_fkey";

-- DropTable
DROP TABLE "GroupChats";

-- CreateTable
CREATE TABLE "GroupChat" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sendTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "GroupChat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupChat" ADD CONSTRAINT "GroupChat_sender_fkey" FOREIGN KEY ("sender") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChat" ADD CONSTRAINT "GroupChat_group_fkey" FOREIGN KEY ("group") REFERENCES "ProjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
