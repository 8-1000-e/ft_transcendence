-- CreateTable
CREATE TABLE "GroupRead" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupRead_pkey" PRIMARY KEY ("userId","groupId")
);
