-- CreateTable
CREATE TABLE "CvMeta" (
    "id" TEXT NOT NULL,
    "cvToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CvMeta_cvToken_key" ON "CvMeta"("cvToken");

-- AddForeignKey
ALTER TABLE "CvMeta" ADD CONSTRAINT "CvMeta_cvToken_fkey" FOREIGN KEY ("cvToken") REFERENCES "Cv"("token") ON DELETE CASCADE ON UPDATE CASCADE;
