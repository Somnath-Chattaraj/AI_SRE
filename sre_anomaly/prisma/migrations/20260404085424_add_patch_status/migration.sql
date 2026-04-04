/*
  Warnings:

  - Made the column `severity` on table `Incident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Incident` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AnomalyLog" ADD COLUMN     "raw_data" JSONB,
ALTER COLUMN "value" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "patchStatus" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "severity" SET NOT NULL,
ALTER COLUMN "severity" SET DEFAULT 'MEDIUM',
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'unknown';
