-- CreateTable
CREATE TABLE "ReferenceDocument" (
    "id" TEXT NOT NULL,
    "cvToken" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "cvToken" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalText" (
    "id" TEXT NOT NULL,
    "cvToken" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalText_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReferenceDocument" ADD CONSTRAINT "ReferenceDocument_cvToken_fkey" FOREIGN KEY ("cvToken") REFERENCES "Cv"("token") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_cvToken_fkey" FOREIGN KEY ("cvToken") REFERENCES "Cv"("token") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalText" ADD CONSTRAINT "AdditionalText_cvToken_fkey" FOREIGN KEY ("cvToken") REFERENCES "Cv"("token") ON DELETE CASCADE ON UPDATE CASCADE;
