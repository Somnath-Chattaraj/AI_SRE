-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "url_codebase" TEXT NOT NULL DEFAULT 'http://github.com',
ADD COLUMN     "url_server" TEXT NOT NULL DEFAULT 'http://example.com';
