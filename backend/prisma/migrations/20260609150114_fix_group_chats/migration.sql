/*
  Warnings:

  - You are about to drop the `Chats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chats" DROP CONSTRAINT "Chats_group_fkey";

-- DropForeignKey
ALTER TABLE "Chats" DROP CONSTRAINT "Chats_sender_fkey";

-- DropTable
DROP TABLE "Chats";

-- CreateTable
CREATE TABLE "GroupChats" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sendTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "GroupChats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupChats" ADD CONSTRAINT "GroupChats_sender_fkey" FOREIGN KEY ("sender") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChats" ADD CONSTRAINT "GroupChats_group_fkey" FOREIGN KEY ("group") REFERENCES "ProjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
