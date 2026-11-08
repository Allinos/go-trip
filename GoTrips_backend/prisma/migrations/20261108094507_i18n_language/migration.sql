-- DropIndex
DROP INDEX "driver_profiles_service_areas_gin";

-- DropIndex
DROP INDEX "driver_profiles_vehicle_types_gin";

-- DropIndex
DROP INDEX "places_name_key_trgm";

-- DropIndex
DROP INDEX "trip_stops_place_key_trgm";

-- DropIndex
DROP INDEX "users_full_name_trgm";

-- DropIndex
DROP INDEX "users_phone_trgm";

-- AlterTable
ALTER TABLE "document_requirements" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "faqs" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "partner_categories" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language" VARCHAR(5) NOT NULL DEFAULT 'en';
