-- CreateTable
CREATE TABLE "Projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectsPost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "writer" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectsChat" (
    "id" TEXT NOT NULL,
    "answeringPost" TEXT,
    "answeringChat" TEXT,
    "writer" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectsChat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectsPost" ADD CONSTRAINT "ProjectsPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsPost" ADD CONSTRAINT "ProjectsPost_writer_fkey" FOREIGN KEY ("writer") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsChat" ADD CONSTRAINT "ProjectsChat_answeringPost_fkey" FOREIGN KEY ("answeringPost") REFERENCES "ProjectsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsChat" ADD CONSTRAINT "ProjectsChat_answeringChat_fkey" FOREIGN KEY ("answeringChat") REFERENCES "ProjectsChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsChat" ADD CONSTRAINT "ProjectsChat_writer_fkey" FOREIGN KEY ("writer") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
