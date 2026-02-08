CREATE TABLE "AppEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cvToken" TEXT,
    "type" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AppEvent" ADD CONSTRAINT "AppEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AppEvent_type_createdAt_idx" ON "AppEvent"("type", "createdAt");
CREATE INDEX "AppEvent_cvToken_createdAt_idx" ON "AppEvent"("cvToken", "createdAt");
