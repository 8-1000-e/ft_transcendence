-- CreateTable
CREATE TABLE "Chats" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sendTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "Chats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Chats" ADD CONSTRAINT "Chats_sender_fkey" FOREIGN KEY ("sender") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chats" ADD CONSTRAINT "Chats_group_fkey" FOREIGN KEY ("group") REFERENCES "ProjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
