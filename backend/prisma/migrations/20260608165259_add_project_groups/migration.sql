-- CreateTable
CREATE TABLE "ProjectGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "groupProject" TEXT NOT NULL,
    "groupCampus" TEXT NOT NULL,

    CONSTRAINT "ProjectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProjectGroupToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectGroupToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectGroupToUser_B_index" ON "_ProjectGroupToUser"("B");

-- AddForeignKey
ALTER TABLE "_ProjectGroupToUser" ADD CONSTRAINT "_ProjectGroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ProjectGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectGroupToUser" ADD CONSTRAINT "_ProjectGroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
