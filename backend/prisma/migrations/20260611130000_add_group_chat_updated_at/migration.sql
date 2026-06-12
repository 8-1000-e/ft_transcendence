ALTER TABLE "GroupChat"
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "GroupChat"
SET "updatedAt" = "sendTime"
WHERE "updatedAt" IS NULL;

ALTER TABLE "GroupChat"
ALTER COLUMN "updatedAt" SET NOT NULL;
