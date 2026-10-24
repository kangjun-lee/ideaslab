-- Keep one row per user/post pair before enforcing uniqueness.
DELETE FROM "Like" AS duplicate
USING "Like" AS original
WHERE duplicate."userId" = original."userId"
  AND duplicate."postId" = original."postId"
  AND duplicate."id" > original."id";

-- Use timezone-aware timestamps consistently. Existing Prisma DateTime values
-- were stored as UTC, so make that interpretation explicit during conversion.
ALTER TABLE "User"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "leavedAt" TYPE TIMESTAMPTZ USING "leavedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Category"
  RENAME COLUMN "updateAt" TO "updatedAt";

ALTER TABLE "Category"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Comment"
  RENAME COLUMN "updateAt" TO "updatedAt";

ALTER TABLE "Post"
  RENAME COLUMN "updateAt" TO "updatedAt";

-- Make all dependent records follow their parent lifecycle.
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" DROP CONSTRAINT "Like_postId_fkey";
ALTER TABLE "Like"
  ADD CONSTRAINT "Like_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" DROP CONSTRAINT "Like_userId_fkey";
ALTER TABLE "Like"
  ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT "Post_categoryId_fkey";
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoiceLog" DROP CONSTRAINT "VoiceLog_userDiscordId_fkey";
ALTER TABLE "VoiceLog"
  ADD CONSTRAINT "VoiceLog_userDiscordId_fkey"
  FOREIGN KEY ("userDiscordId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageLog" DROP CONSTRAINT "MessageLog_userDiscordId_fkey";
ALTER TABLE "MessageLog"
  ADD CONSTRAINT "MessageLog_userDiscordId_fkey"
  FOREIGN KEY ("userDiscordId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Point" DROP CONSTRAINT "Point_userId_fkey";
ALTER TABLE "Point"
  ADD CONSTRAINT "Point_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent duplicate likes and support relation/filter/order query paths.
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");
CREATE INDEX "Like_postId_idx" ON "Like"("postId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt" ASC);
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt" DESC);
CREATE INDEX "Post_categoryId_createdAt_idx" ON "Post"("categoryId", "createdAt" DESC);
CREATE INDEX "Point_userId_idx" ON "Point"("userId");
