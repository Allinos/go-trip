-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "booking_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "reviews_partner_id_user_id_idx" ON "reviews"("partner_id", "user_id");


-- One driver review per user per driver (trip reviews are unique per booking instead).
CREATE UNIQUE INDEX "reviews_one_driver_review_per_user" ON "reviews" ("partner_id", "user_id") WHERE "booking_id" IS NULL;
