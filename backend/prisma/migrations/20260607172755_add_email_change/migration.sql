-- AlterEnum
ALTER TYPE "EmailTokenType" ADD VALUE 'CHANGE_EMAIL';

-- AlterTable
ALTER TABLE "EmailToken" ADD COLUMN     "newEmail" TEXT;
