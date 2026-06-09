-- Rename the 42 project id column to match the application domain name.
ALTER TABLE "ProjectGroup" RENAME COLUMN "groupProjectId" TO "projectId";

-- Allow users to opt in/out of being suggested by the recommendation system.
ALTER TABLE "User" ADD COLUMN "canSuggest" BOOLEAN NOT NULL DEFAULT true;
