/*
  Warnings:

  - You are about to drop the column `passingScore` on the `Assessment` table. All the data in the column will be lost.
  - Added the required column `passingPercentage` to the `Assessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Assessment" DROP COLUMN "passingScore",
ADD COLUMN     "passingPercentage" INTEGER NOT NULL,
ADD COLUMN     "thumbnailKey" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;
