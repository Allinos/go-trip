-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('login');

-- CreateEnum
CREATE TYPE "AppKind" AS ENUM ('user', 'partner');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('android', 'ios', 'web');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('partner', 'vehicle');

-- CreateEnum
CREATE TYPE "PartnerAccount" AS ENUM ('onboarding', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "VehicleClass" AS ENUM ('hatchback', 'sedan', 'suv', 'muv', 'van', 'mini_bus', 'bus', 'auto', 'bike', 'pickup', 'tempo', 'mini_truck', 'truck', 'trailer', 'other');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('petrol', 'diesel', 'cng', 'electric', 'hybrid');

-- CreateEnum
CREATE TYPE "RentalDriverOption" AS ENUM ('self_drive', 'with_driver', 'both');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('start', 'return');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "Actor" AS ENUM ('user', 'partner', 'admin', 'system');

-- CreateEnum
CREATE TYPE "GoodsOrderStatus" AS ENUM ('open', 'assigned', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('registration_fee');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "ContactTarget" AS ENUM ('driver_profile', 'vehicle', 'trip', 'goods_order');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "FaqAudience" AS ENUM ('all', 'user', 'partner');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'support');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "full_name" VARCHAR(100),
    "email" VARCHAR(150),
    "photo_key" VARCHAR(255),
    "gender" "Gender",
    "date_of_birth" DATE,
    "city" VARCHAR(80),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "block_reason" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'login',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "app" "AppKind" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_info" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "app" "AppKind" NOT NULL,
    "platform" "Platform" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_places" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_categories" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "icon" VARCHAR(50),
    "registration_fee" INTEGER NOT NULL DEFAULT 0,
    "fee_validity_days" INTEGER,
    "has_driver_profile" BOOLEAN NOT NULL DEFAULT false,
    "can_list_vehicles" BOOLEAN NOT NULL DEFAULT false,
    "can_create_trips" BOOLEAN NOT NULL DEFAULT false,
    "can_list_rentals" BOOLEAN NOT NULL DEFAULT false,
    "can_view_goods_orders" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "scope" "DocumentScope" NOT NULL DEFAULT 'partner',
    "doc_type" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "hint" VARCHAR(255),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "requires_number" BOOLEAN NOT NULL DEFAULT false,
    "requires_expiry" BOOLEAN NOT NULL DEFAULT false,
    "requires_back" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "business_name" VARCHAR(120),
    "alternate_phone" VARCHAR(15),
    "whatsapp_phone" VARCHAR(15),
    "address" VARCHAR(255),
    "district" VARCHAR(80),
    "city" VARCHAR(80),
    "pincode" VARCHAR(10),
    "account_status" "PartnerAccount" NOT NULL DEFAULT 'onboarding',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "rejection_reason" VARCHAR(500),
    "suspended_reason" VARCHAR(500),
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "fee_paid_at" TIMESTAMP(3),
    "listing_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_documents" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "doc_type" VARCHAR(40) NOT NULL,
    "doc_number" VARCHAR(60),
    "expiry_date" DATE,
    "front_key" VARCHAR(255) NOT NULL,
    "back_key" VARCHAR(255),
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" VARCHAR(255),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "headline" VARCHAR(120),
    "bio" VARCHAR(1000),
    "has_prior_experience" BOOLEAN NOT NULL DEFAULT false,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "experience_details" VARCHAR(1000),
    "license_number" VARCHAR(40),
    "license_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "license_expiry" DATE,
    "vehicle_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "can_drive_automatic" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "work_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" VARCHAR(30),
    "expected_pay_min" INTEGER,
    "expected_pay_max" INTEGER,
    "pay_unit" VARCHAR(20),
    "education" VARCHAR(80),
    "has_own_vehicle" BOOLEAN NOT NULL DEFAULT false,
    "district" VARCHAR(80),
    "city" VARCHAR(80),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_listed" BOOLEAN NOT NULL DEFAULT false,
    "listed_at" TIMESTAMP(3),
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "call_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "vehicle_class" "VehicleClass" NOT NULL,
    "make" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "year" INTEGER,
    "color" VARCHAR(30),
    "registration_number" VARCHAR(20) NOT NULL,
    "seats" INTEGER,
    "load_capacity_kg" INTEGER,
    "fuel_type" "FuelType",
    "has_ac" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" VARCHAR(1000),
    "photo_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "for_trips" BOOLEAN NOT NULL DEFAULT false,
    "for_rental" BOOLEAN NOT NULL DEFAULT false,
    "for_goods" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" VARCHAR(500),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "verified_by" INTEGER,
    "rental_available" BOOLEAN NOT NULL DEFAULT false,
    "rental_price_per_day" INTEGER,
    "rental_price_per_hour" INTEGER,
    "rental_driver_option" "RentalDriverOption",
    "security_deposit" INTEGER,
    "rental_min_hours" INTEGER,
    "rental_district" VARCHAR(80),
    "rental_city" VARCHAR(80),
    "rental_address" VARCHAR(255),
    "rental_lat" DOUBLE PRECISION,
    "rental_lng" DOUBLE PRECISION,
    "rental_terms" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "doc_type" VARCHAR(40) NOT NULL,
    "doc_number" VARCHAR(60),
    "expiry_date" DATE,
    "front_key" VARCHAR(255) NOT NULL,
    "back_key" VARCHAR(255),
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" VARCHAR(255),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "trip_type" "TripType" NOT NULL,
    "parent_trip_id" INTEGER,
    "origin_name" VARCHAR(120) NOT NULL,
    "destination_name" VARCHAR(120) NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3),
    "total_seats" INTEGER NOT NULL,
    "available_seats" INTEGER NOT NULL,
    "price_per_seat" INTEGER NOT NULL,
    "accepts_parcels" BOOLEAN NOT NULL DEFAULT false,
    "booking_open" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "status" "TripStatus" NOT NULL DEFAULT 'scheduled',
    "cancel_reason" VARCHAR(255),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "place_name" VARCHAR(120) NOT NULL,
    "place_key" VARCHAR(120) NOT NULL,
    "district" VARCHAR(80),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "fare_from_start" INTEGER,
    "eta_minutes" INTEGER,

    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "pickup_seq" INTEGER NOT NULL,
    "drop_seq" INTEGER NOT NULL,
    "pickup_name" VARCHAR(120) NOT NULL,
    "drop_name" VARCHAR(120) NOT NULL,
    "fare_estimate" INTEGER NOT NULL,
    "passenger_name" VARCHAR(100),
    "passenger_phone" VARCHAR(15) NOT NULL,
    "note" VARCHAR(300),
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "status_reason" VARCHAR(255),
    "cancelled_by" "Actor",
    "responded_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "pickup_name" VARCHAR(160) NOT NULL,
    "pickup_district" VARCHAR(80),
    "pickup_lat" DOUBLE PRECISION,
    "pickup_lng" DOUBLE PRECISION,
    "drop_name" VARCHAR(160) NOT NULL,
    "drop_district" VARCHAR(80),
    "drop_lat" DOUBLE PRECISION,
    "drop_lng" DOUBLE PRECISION,
    "goods_type" VARCHAR(80) NOT NULL,
    "weight_kg" INTEGER,
    "vehicle_class" "VehicleClass",
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(1000),
    "contact_phone" VARCHAR(15) NOT NULL,
    "budget" INTEGER,
    "status" "GoodsOrderStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'registration_fee',
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'created',
    "razorpay_order_id" VARCHAR(64) NOT NULL,
    "razorpay_payment_id" VARCHAR(64),
    "razorpay_signature" VARCHAR(128),
    "method" VARCHAR(30),
    "failure_reason" VARCHAR(255),
    "receipt" VARCHAR(40) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "category_code" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" SERIAL NOT NULL,
    "event_id" VARCHAR(64) NOT NULL,
    "event" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_shares" (
    "partner_id" INTEGER NOT NULL,
    "is_sharing" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy_m" DOUBLE PRECISION,
    "trip_id" INTEGER,
    "started_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_shares_pkey" PRIMARY KEY ("partner_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "app" "AppKind" NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_events" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "target_type" "ContactTarget" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "channel" VARCHAR(15) NOT NULL DEFAULT 'call',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "state" VARCHAR(60) NOT NULL DEFAULT 'Assam',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "name_key" VARCHAR(120) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "app" "AppKind" NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "subject" VARCHAR(150) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "admin_reply" VARCHAR(2000),
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" SERIAL NOT NULL,
    "audience" "FaqAudience" NOT NULL DEFAULT 'all',
    "question" VARCHAR(300) NOT NULL,
    "answer" VARCHAR(2000) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(40),
    "details" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(60) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "otp_codes_phone_created_at_idx" ON "otp_codes"("phone", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_app_is_active_idx" ON "push_tokens"("user_id", "app", "is_active");

-- CreateIndex
CREATE INDEX "saved_places_user_id_idx" ON "saved_places"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_categories_code_key" ON "partner_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_category_id_scope_doc_type_key" ON "document_requirements"("category_id", "scope", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "partners_user_id_key" ON "partners"("user_id");

-- CreateIndex
CREATE INDEX "partners_category_id_account_status_idx" ON "partners"("category_id", "account_status");

-- CreateIndex
CREATE INDEX "partners_verification_status_idx" ON "partners"("verification_status");

-- CreateIndex
CREATE INDEX "partners_created_at_idx" ON "partners"("created_at");

-- CreateIndex
CREATE INDEX "partner_documents_status_idx" ON "partner_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partner_documents_partner_id_doc_type_key" ON "partner_documents"("partner_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_partner_id_key" ON "driver_profiles"("partner_id");

-- CreateIndex
CREATE INDEX "driver_profiles_is_listed_district_idx" ON "driver_profiles"("is_listed", "district");

-- CreateIndex
CREATE INDEX "driver_profiles_is_listed_experience_years_idx" ON "driver_profiles"("is_listed", "experience_years");

-- CreateIndex
CREATE INDEX "driver_profiles_is_listed_listed_at_idx" ON "driver_profiles"("is_listed", "listed_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "vehicles_partner_id_idx" ON "vehicles"("partner_id");

-- CreateIndex
CREATE INDEX "vehicles_verification_status_submitted_at_idx" ON "vehicles"("verification_status", "submitted_at");

-- CreateIndex
CREATE INDEX "vehicles_for_rental_verification_status_rental_district_idx" ON "vehicles"("for_rental", "verification_status", "rental_district");

-- CreateIndex
CREATE INDEX "vehicles_rental_lat_rental_lng_idx" ON "vehicles"("rental_lat", "rental_lng");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_vehicle_id_doc_type_key" ON "vehicle_documents"("vehicle_id", "doc_type");

-- CreateIndex
CREATE INDEX "trips_status_departure_at_idx" ON "trips"("status", "departure_at");

-- CreateIndex
CREATE INDEX "trips_partner_id_departure_at_idx" ON "trips"("partner_id", "departure_at");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_departure_at_idx" ON "trips"("vehicle_id", "departure_at");

-- CreateIndex
CREATE INDEX "trip_stops_place_key_idx" ON "trip_stops"("place_key");

-- CreateIndex
CREATE INDEX "trip_stops_district_idx" ON "trip_stops"("district");

-- CreateIndex
CREATE UNIQUE INDEX "trip_stops_trip_id_seq_key" ON "trip_stops"("trip_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE INDEX "bookings_partner_id_status_created_at_idx" ON "bookings"("partner_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_trip_id_status_idx" ON "bookings"("trip_id", "status");

-- CreateIndex
CREATE INDEX "goods_orders_status_pickup_date_idx" ON "goods_orders"("status", "pickup_date");

-- CreateIndex
CREATE INDEX "goods_orders_pickup_district_status_idx" ON "goods_orders"("pickup_district", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_key" ON "payments"("receipt");

-- CreateIndex
CREATE INDEX "payments_partner_id_created_at_idx" ON "payments"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_event_id_key" ON "payment_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_app_created_at_idx" ON "notifications"("user_id", "app", "created_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "contact_events_partner_id_created_at_idx" ON "contact_events"("partner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE INDEX "places_name_key_idx" ON "places"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "places_district_id_name_key_key" ON "places"("district_id", "name_key");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "faqs_audience_is_active_idx" ON "faqs"("audience", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "partner_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "partner_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_parent_trip_id_fkey" FOREIGN KEY ("parent_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_orders" ADD CONSTRAINT "goods_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_shares" ADD CONSTRAINT "location_shares_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
