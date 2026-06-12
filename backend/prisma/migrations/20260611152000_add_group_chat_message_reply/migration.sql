ALTER TABLE "GroupChat"
ADD COLUMN "messageReply" TEXT;

ALTER TABLE "GroupChat"
ADD CONSTRAINT "GroupChat_messageReply_fkey"
FOREIGN KEY ("messageReply") REFERENCES "GroupChat"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
