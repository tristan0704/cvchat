-- XP wird als verdienter Profil-Fortschritt gespeichert. Ein Interview kann
-- dadurch nur einmal XP vergeben, auch wenn es später erneut geöffnet wird.
ALTER TABLE "Profile"
ADD COLUMN IF NOT EXISTS "xpPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Interview"
ADD COLUMN IF NOT EXISTS "xpAwardedAt" TIMESTAMP(3);

WITH completed_counts AS (
    SELECT
        "userId",
        COUNT(*)::integer AS completed_count
    FROM "Interview"
    WHERE "status" = 'completed'
    GROUP BY "userId"
)
UPDATE "Profile" AS profile
SET "xpPoints" = completed_counts.completed_count * 10
FROM completed_counts
WHERE profile."userId" = completed_counts."userId";

UPDATE "Interview"
SET "xpAwardedAt" = COALESCE("completedAt", CURRENT_TIMESTAMP)
WHERE "status" = 'completed'
  AND "xpAwardedAt" IS NULL;
