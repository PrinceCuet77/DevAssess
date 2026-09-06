/*
  Warnings:

  - You are about to drop the column `passed` on the `attempts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attempts" DROP COLUMN "passed",
ADD COLUMN     "isPassed" BOOLEAN;
