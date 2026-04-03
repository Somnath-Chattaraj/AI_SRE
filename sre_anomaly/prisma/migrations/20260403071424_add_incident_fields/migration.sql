-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "details" JSONB,
ADD COLUMN     "severity" TEXT,
ADD COLUMN     "type" TEXT;
