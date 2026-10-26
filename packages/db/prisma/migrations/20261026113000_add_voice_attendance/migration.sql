CREATE TABLE "VoiceAttendance" (
    "date" DATE NOT NULL,
    "userDiscordId" TEXT NOT NULL,

    CONSTRAINT "VoiceAttendance_pkey" PRIMARY KEY ("userDiscordId", "date")
);

CREATE INDEX "VoiceAttendance_date_idx" ON "VoiceAttendance"("date" DESC);

ALTER TABLE "VoiceAttendance"
  ADD CONSTRAINT "VoiceAttendance_userDiscordId_fkey"
  FOREIGN KEY ("userDiscordId") REFERENCES "User"("discordId")
  ON DELETE CASCADE ON UPDATE CASCADE;
