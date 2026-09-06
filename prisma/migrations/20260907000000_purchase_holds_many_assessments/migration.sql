-- A purchase is now an order that can carry several assessments. Each assessment
-- on the order lives in `purchase_items` and keeps the price it sold for, while
-- `purchases.price` holds the order total.

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_items_assessmentId_idx" ON "purchase_items"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_purchaseId_assessmentId_key" ON "purchase_items"("purchaseId", "assessmentId");

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every purchase that exists today becomes a one-item order priced the
-- same as the order total, so no paid entitlement is lost.
INSERT INTO "purchase_items" ("id", "price", "purchaseId", "assessmentId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "price", "id", "assessmentId", "createdAt", "updatedAt"
FROM "purchases";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_assessmentId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "purchases_assessmentId_idx";

-- AlterTable (drops the unique index on (customerId, assessmentId) with the column;
-- one assessment per order is enforced by purchase_items_purchaseId_assessmentId_key)
ALTER TABLE "purchases" DROP COLUMN "assessmentId";
