-- =====================================================
-- RIDEFLOW DATABASE SCHEMA
-- Taxi & Vehicle Rental Platform
-- User App + Partner App
-- =====================================================

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    country_code VARCHAR(5) NOT NULL DEFAULT '+91',
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    profile_photo_url VARCHAR(255),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    user_type ENUM('passenger', 'driver', 'both') DEFAULT 'passenger',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    terms_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_email (email)
);

CREATE TABLE otp_verification (
    otp_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    otp_type ENUM('login', 'signup', 'verification') DEFAULT 'login',
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_phone_otp (phone_number, otp_code)
);

CREATE TABLE user_saved_locations (
    location_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    location_type ENUM('home', 'work', 'other') NOT NULL,
    location_name VARCHAR(100),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    landmark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_locations (user_id)
);

-- =====================================================
-- PARTNER/DRIVER MANAGEMENT
-- =====================================================

CREATE TABLE partners (
    partner_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNIQUE NOT NULL,
    partner_type ENUM('taxi_driver', 'bike_rider', 'vehicle_owner') NOT NULL,
    business_name VARCHAR(100),
    verification_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    verification_date TIMESTAMP,
    rejection_reason TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(20),
    bank_account_holder VARCHAR(100),
    upi_id VARCHAR(100),
    rating_average DECIMAL(3, 2) DEFAULT 0.00,
    total_rides_completed INT DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    pending_payout DECIMAL(10, 2) DEFAULT 0.00,
    language_preference VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_partner_type (partner_type),
    INDEX idx_verification_status (verification_status)
);

CREATE TABLE partner_documents (
    document_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    partner_id BIGINT NOT NULL,
    document_type ENUM('driving_license', 'vehicle_rc', 'insurance', 'aadhar', 'pan', 'other') NOT NULL,
    document_number VARCHAR(100),
    document_url VARCHAR(255) NOT NULL,
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    expiry_date DATE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(partner_id) ON DELETE CASCADE,
    INDEX idx_partner_docs (partner_id)
);

-- =====================================================
-- VEHICLE MANAGEMENT
-- =====================================================

CREATE TABLE vehicles (
    vehicle_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    partner_id BIGINT NOT NULL,
    vehicle_type ENUM('taxi', 'bike', 'rental_car', 'commercial_vehicle') NOT NULL,
    vehicle_category ENUM('sedan', 'suv', 'hatchback', 'motorcycle', 'auto', 'mini_truck', 'van') NOT NULL,
    manufacturer VARCHAR(50),
    model VARCHAR(50),
    year INT,
    color VARCHAR(30),
    number_plate VARCHAR(20) UNIQUE NOT NULL,
    seating_capacity INT,
    fuel_type ENUM('petrol', 'diesel', 'cng', 'electric', 'hybrid'),
    ac_available BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    rental_price_per_hour DECIMAL(10, 2),
    rental_price_per_day DECIMAL(10, 2),
    ride_price_per_km DECIMAL(10, 2),
    base_fare DECIMAL(10, 2),
    vehicle_photos JSON, -- Array of photo URLs
    features JSON, -- Array of features like ["GPS", "Music System", "Child Seat"]
    rating_average DECIMAL(3, 2) DEFAULT 0.00,
    total_trips INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(partner_id) ON DELETE CASCADE,
    INDEX idx_vehicle_type (vehicle_type),
    INDEX idx_availability (is_available),
    INDEX idx_number_plate (number_plate)
);

-- =====================================================
-- RIDE MANAGEMENT
-- =====================================================

CREATE TABLE rides (
    ride_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_type ENUM('taxi', 'bike', 'rental', 'commercial') NOT NULL,
    passenger_id BIGINT NOT NULL,
    driver_id BIGINT,
    vehicle_id BIGINT,
    
    -- Pickup & Drop Details
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_landmark VARCHAR(255),
    
    drop_address TEXT,
    drop_latitude DECIMAL(10, 8),
    drop_longitude DECIMAL(11, 8),
    drop_landmark VARCHAR(255),
    
    -- Ride Schedule
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    pickup_datetime TIMESTAMP,
    start_datetime TIMESTAMP,
    end_datetime TIMESTAMP,
    
    -- Ride Details
    distance_km DECIMAL(10, 2),
    duration_minutes INT,
    seats_required INT DEFAULT 1,
    seats_available INT,
    
    -- Pricing
    base_fare DECIMAL(10, 2),
    distance_fare DECIMAL(10, 2),
    time_fare DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_fare DECIMAL(10, 2),
    
    -- Status
    ride_status ENUM('pending', 'accepted', 'started', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_by ENUM('passenger', 'driver', 'system'),
    cancelled_at TIMESTAMP,
    
    -- Additional Info
    special_instructions TEXT,
    otp_code VARCHAR(6), -- For ride verification
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES partners(partner_id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    
    INDEX idx_passenger (passenger_id),
    INDEX idx_driver (driver_id),
    INDEX idx_status (ride_status),
    INDEX idx_scheduled (scheduled_date, scheduled_time)
);

CREATE TABLE rental_bookings (
    booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    passenger_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    
    -- Rental Period
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE NOT NULL,
    end_time TIME NOT NULL,
    
    rental_duration_hours INT,
    rental_duration_days INT,
    
    -- Pricing
    price_per_hour DECIMAL(10, 2),
    price_per_day DECIMAL(10, 2),
    total_rental_amount DECIMAL(10, 2),
    security_deposit DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    -- Pickup/Return Location
    pickup_location TEXT,
    return_location TEXT,
    
    -- Status
    booking_status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    cancellation_reason TEXT,
    
    -- Documents
    rental_agreement_url VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES partners(partner_id) ON DELETE CASCADE,
    
    INDEX idx_passenger_rentals (passenger_id),
    INDEX idx_vehicle_rentals (vehicle_id),
    INDEX idx_booking_status (booking_status)
);

-- =====================================================
-- RIDE TRACKING & LOCATION
-- =====================================================

CREATE TABLE ride_tracking (
    tracking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT NOT NULL,
    driver_latitude DECIMAL(10, 8),
    driver_longitude DECIMAL(11, 8),
    speed_kmph DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    eta_minutes INT,
    distance_to_pickup_km DECIMAL(10, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
    INDEX idx_ride_tracking (ride_id, recorded_at)
);

-- =====================================================
-- PAYMENTS
-- =====================================================

CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    transaction_type ENUM('ride', 'rental', 'payout', 'refund','driver') NOT NULL,
    ride_id BIGINT,
    rental_booking_id BIGINT,
    payer_id BIGINT NOT NULL,
    payee_id BIGINT,
    
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'upi', 'wallet', 'card', 'netbanking') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Payment Gateway Details
    transaction_id VARCHAR(100) UNIQUE,
    gateway_name VARCHAR(50),
    gateway_response JSON,
    
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE SET NULL,
    FOREIGN KEY (rental_booking_id) REFERENCES rental_bookings(booking_id) ON DELETE SET NULL,
    FOREIGN KEY (payer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (payee_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_payer (payer_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_payment_status (payment_status)
);

CREATE TABLE partner_earnings (
    earning_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    partner_id BIGINT NOT NULL,
    ride_id BIGINT,
    rental_booking_id BIGINT,
    
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_percentage DECIMAL(5, 2) DEFAULT 15.00,
    commission_amount DECIMAL(10, 2),
    net_earnings DECIMAL(10, 2),
    
    payout_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    payout_date TIMESTAMP,
    payout_transaction_id VARCHAR(100),
    
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (partner_id) REFERENCES partners(partner_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE SET NULL,
    FOREIGN KEY (rental_booking_id) REFERENCES rental_bookings(booking_id) ON DELETE SET NULL,
    
    INDEX idx_partner_earnings (partner_id),
    INDEX idx_payout_status (payout_status)
);

-- =====================================================
-- RATINGS & REVIEWS
-- =====================================================

CREATE TABLE ratings_reviews (
    review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    review_type ENUM('ride', 'rental', 'driver', 'vehicle') NOT NULL,
    ride_id BIGINT,
    rental_booking_id BIGINT,
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT, -- Driver/Owner being reviewed
    vehicle_id BIGINT,
    
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    review_tags JSON, -- ["Clean", "Polite", "On Time"]
    
    is_visible BOOLEAN DEFAULT TRUE,
    response_text TEXT, -- Partner can respond
    responded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
    FOREIGN KEY (rental_booking_id) REFERENCES rental_bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_vehicle_reviews (vehicle_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    notification_type ENUM('ride_request', 'ride_accepted', 'ride_started', 'ride_completed', 'payment', 'promotion', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON, -- Additional data for deep linking
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_notifications (user_id, is_read)
);

CREATE TABLE push_tokens (
    token_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    device_token VARCHAR(255) NOT NULL,
    device_type ENUM('android', 'ios') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_device (user_id, device_token),
    INDEX idx_active_tokens (is_active)
);

-- =====================================================
-- SUPPORT & HELP
-- =====================================================

CREATE TABLE support_tickets (
    ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    ride_id BIGINT,
    rental_booking_id BIGINT,
    
    ticket_type ENUM('ride_issue', 'payment_issue', 'driver_complaint', 'vehicle_issue', 'account', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to BIGINT, -- Admin user ID
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE SET NULL,
    FOREIGN KEY (rental_booking_id) REFERENCES rental_bookings(booking_id) ON DELETE SET NULL,
    
    INDEX idx_user_tickets (user_id),
    INDEX idx_ticket_status (status)
);

CREATE TABLE faqs (
    faq_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category ENUM('passenger', 'partner', 'general', 'payment', 'rental') NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category, is_active)
);

-- =====================================================
-- PROMO CODES & OFFERS
-- =====================================================

CREATE TABLE promo_codes (
    promo_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2),
    min_order_amount DECIMAL(10, 2),
    
    usage_limit_per_user INT DEFAULT 1,
    total_usage_limit INT,
    times_used INT DEFAULT 0,
    
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    applicable_to ENUM('all', 'ride', 'rental') DEFAULT 'all',
    user_type ENUM('all', 'new', 'existing') DEFAULT 'all',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_promo_code (promo_code),
    INDEX idx_active_promos (is_active, valid_from, valid_until)
);

CREATE TABLE promo_usage (
    usage_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    promo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    ride_id BIGINT,
    rental_booking_id BIGINT,
    discount_applied DECIMAL(10, 2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (promo_id) REFERENCES promo_codes(promo_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE SET NULL,
    FOREIGN KEY (rental_booking_id) REFERENCES rental_bookings(booking_id) ON DELETE SET NULL,
    
    INDEX idx_user_promo_usage (user_id, promo_id)
);

-- =====================================================
-- EMERGENCY SOS
-- =====================================================

CREATE TABLE emergency_contacts (
    contact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_emergency_contacts (user_id)
);

CREATE TABLE sos_alerts (
    sos_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    ride_id BIGINT,
    
    alert_type ENUM('emergency', 'safety_concern', 'accident') NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_address TEXT,
    
    alert_status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    response_notes TEXT,
    
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE SET NULL,
    
    INDEX idx_sos_status (alert_status, triggered_at)
);

-- =====================================================
-- ANALYTICS & LOGS
-- =====================================================

CREATE TABLE app_sessions (
    session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(255),
    device_type ENUM('android', 'ios'),
    app_version VARCHAR(20),
    os_version VARCHAR(20),
    
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    duration_seconds INT,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_sessions (user_id, session_start)
);

CREATE TABLE search_logs (
    search_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    search_type ENUM('ride', 'rental', 'location'),
    pickup_location TEXT,
    drop_location TEXT,
    vehicle_type VARCHAR(50),
    search_date DATE,
    search_time TIME,
    results_count INT,
    booking_made BOOLEAN DEFAULT FALSE,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_search_logs (user_id, searched_at)
);

-- =====================================================
-- ADMIN CONFIGURATIONS
-- =====================================================

CREATE TABLE app_configurations (
    config_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT INTO app_configurations (config_key, config_value, description) VALUES
('commission_percentage', '15.00', 'Platform commission percentage'),
('cancellation_fee', '50.00', 'Cancellation fee for rides'),
('sos_emergency_number', '100', 'Emergency helpline number'),
('support_email', 'support@rideflow.com', 'Customer support email'),
('support_phone', '+91-1800-XXX-XXXX', 'Customer support phone'),
('min_app_version_android', '1.0.0', 'Minimum required Android app version'),
('tax_percentage', '5.00', 'GST/Tax percentage on rides');

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Additional composite indexes
CREATE INDEX idx_rides_passenger_status ON rides(passenger_id, ride_status);
CREATE INDEX idx_rides_driver_status ON rides(driver_id, ride_status);
CREATE INDEX idx_rides_scheduled ON rides(scheduled_date, scheduled_time, ride_status);
CREATE INDEX idx_vehicles_partner_available ON vehicles(partner_id, is_available);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_earnings_partner_date ON partner_earnings(partner_id, earned_at);

-- =====================================================
-- END OF SCHEMA
-- =====================================================







