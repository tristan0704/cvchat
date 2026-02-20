-- Simplify MVP: remove publish/share + tracking + references pipeline

-- Drop share/publish related structures
DROP INDEX IF EXISTS "Cv_shareToken_key";

ALTER TABLE "Cv"
DROP COLUMN IF EXISTS "isPublished",
DROP COLUMN IF EXISTS "publishedData",
DROP COLUMN IF EXISTS "shareToken",
DROP COLUMN IF EXISTS "shareEnabled",
DROP COLUMN IF EXISTS "publishedAt";

-- Drop deprecated evidence table
DROP TABLE IF EXISTS "ReferenceDocument";

-- Drop analytics table
DROP TABLE IF EXISTS "AppEvent";

