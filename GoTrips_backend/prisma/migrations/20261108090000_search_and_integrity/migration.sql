-- Fuzzy / prefix search on place names, user names and phones (admin search, trip search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS trip_stops_place_key_trgm ON trip_stops USING gin (place_key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_name_key_trgm ON places USING gin (name_key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_phone_trgm ON users USING gin (phone gin_trgm_ops);

-- Array filters on the driver marketplace.
CREATE INDEX IF NOT EXISTS driver_profiles_vehicle_types_gin ON driver_profiles USING gin (vehicle_types);
CREATE INDEX IF NOT EXISTS driver_profiles_service_areas_gin ON driver_profiles USING gin (service_areas);

-- Only upcoming, bookable trips are searched; keep that index small.
CREATE INDEX IF NOT EXISTS trips_searchable_idx ON trips (departure_at) WHERE status = 'scheduled' AND booking_open = true AND available_seats > 0;

-- Data integrity guards (the API also enforces these, the DB is the last line of defence).
ALTER TABLE trips ADD CONSTRAINT trips_seats_check CHECK (available_seats >= 0 AND available_seats <= total_seats AND total_seats > 0);
ALTER TABLE trips ADD CONSTRAINT trips_price_check CHECK (price_per_seat >= 0);
ALTER TABLE bookings ADD CONSTRAINT bookings_seats_check CHECK (seats > 0 AND drop_seq > pickup_seq);
ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount > 0);

-- A user can hold only one open (pending/accepted) booking per trip.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_open_per_user_trip ON bookings (trip_id, user_id) WHERE status IN ('pending', 'accepted');
