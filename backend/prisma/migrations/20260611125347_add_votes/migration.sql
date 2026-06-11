-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('UP', 'DOWN');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "rdmCampus" DROP NOT NULL,
ALTER COLUMN "rdmName" DROP NOT NULL,
ALTER COLUMN "rdmPfp" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PostVote" (
    "vote" "VoteValue" NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "PostVote_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "ChatVote" (
    "vote" "VoteValue" NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "ChatVote_pkey" PRIMARY KEY ("userId","chatId")
);

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ProjectsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatVote" ADD CONSTRAINT "ChatVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatVote" ADD CONSTRAINT "ChatVote_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ProjectsChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
