-- Vehicle category (passenger / commercial goods vehicle) with goods-specific fields
CREATE TYPE "VehicleCategory" AS ENUM ('passenger', 'commercial');
CREATE TYPE "TripKind" AS ENUM ('passenger', 'goods');

ALTER TABLE "vehicles" ADD COLUMN "category" "VehicleCategory" NOT NULL DEFAULT 'passenger',
  ADD COLUMN "body_type" VARCHAR(30),
  ADD COLUMN "cargo_length_ft" DOUBLE PRECISION;
UPDATE "vehicles" SET "category" = 'commercial' WHERE "vehicle_class" IN ('pickup', 'tempo', 'mini_truck', 'truck', 'trailer');
-- Goods vehicles don't carry passengers: seats belonged to the old generic form.
UPDATE "vehicles" SET "seats" = NULL WHERE "category" = 'commercial';

-- Trips with goods vehicles: the whole vehicle is hired for the route
ALTER TABLE "trips" ADD COLUMN "kind" "TripKind" NOT NULL DEFAULT 'passenger',
  ADD COLUMN "capacity_kg" INTEGER;
UPDATE "trips" t SET "kind" = 'goods', "capacity_kg" = v."load_capacity_kg", "total_seats" = 1,
  "available_seats" = LEAST(t."available_seats", 1)
  FROM "vehicles" v WHERE v."id" = t."vehicle_id" AND v."category" = 'commercial';
CREATE INDEX "trips_kind_status_departure_at_idx" ON "trips"("kind", "status", "departure_at");

ALTER TABLE "bookings" ADD COLUMN "goods_type" VARCHAR(80), ADD COLUMN "load_kg" INTEGER;
