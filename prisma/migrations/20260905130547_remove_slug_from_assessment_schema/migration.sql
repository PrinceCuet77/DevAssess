/*
  Warnings:

  - You are about to drop the column `slug` on the `Assessment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Assessment_slug_key";

-- AlterTable
ALTER TABLE "Assessment" DROP COLUMN "slug",
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
