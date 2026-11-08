# RideFlow Database Documentation

## Overview
This database schema supports a comprehensive Taxi & Vehicle Rental platform with two primary applications:
1. **RideFlow User App** - For passengers booking rides and renting vehicles
2. **RideFlow Partner App** - For drivers, riders, and vehicle owners

## Database Structure

### 📊 Table Count: 25 Tables
### 🗂️ Categories: 10 Major Sections

---

## 1. USERS & AUTHENTICATION (3 Tables)

### `users`
**Purpose:** Central user table for both passengers and partners

**Key Fields:**
- `user_id`: Primary identifier
- `phone_number`: Unique login credential
- `user_type`: Differentiates between passenger, driver, or both
- `is_verified`: Account verification status
- `terms_accepted`, `privacy_accepted`: Legal compliance

**Relationships:**
- One user can be both passenger and partner
- Links to all user-specific activities

### `otp_verification`
**Purpose:** Handles phone number OTP verification

**Key Fields:**
- `otp_code`: 6-digit verification code
- `otp_type`: login, signup, or verification
- `expires_at`: Time-based expiry

**Use Cases:**
- Login authentication
- Phone number verification
- Password reset

### `user_saved_locations`
**Purpose:** Stores frequently used addresses (Home, Work, etc.)

**Key Fields:**
- `location_type`: home, work, other
- `latitude`, `longitude`: GPS coordinates
- `landmark`: Additional location detail

---

## 2. PARTNER/DRIVER MANAGEMENT (2 Tables)

### `partners`
**Purpose:** Extended profile for drivers and vehicle owners

**Key Fields:**
- `partner_type`: taxi_driver, bike_rider, vehicle_owner
- `verification_status`: pending, approved, rejected, suspended
- `is_online`: Real-time availability toggle
- `rating_average`: Performance metric
- `total_earnings`: Lifetime earnings
- `pending_payout`: Unpaid earnings

**Business Logic:**
- Partners must be verified before accepting rides
- Online/offline status controls ride visibility
- Earnings tracked separately from payments

### `partner_documents`
**Purpose:** Stores verification documents

**Key Fields:**
- `document_type`: driving_license, vehicle_rc, insurance, etc.
- `verification_status`: Independent verification for each document
- `expiry_date`: For time-sensitive documents

**Verification Workflow:**
1. Partner uploads document
2. Admin reviews document
3. Status updated to approved/rejected
4. Partner notified

---

## 3. VEHICLE MANAGEMENT (1 Table)

### `vehicles`
**Purpose:** Complete vehicle inventory

**Key Fields:**
- `vehicle_type`: taxi, bike, rental_car, commercial_vehicle
- `vehicle_category`: More specific classification
- `number_plate`: Unique identifier
- `seating_capacity`: Important for matching
- `is_available`: Real-time availability
- `rental_price_per_hour`, `rental_price_per_day`: Rental pricing
- `ride_price_per_km`, `base_fare`: Ride pricing
- `vehicle_photos`: JSON array of image URLs
- `features`: JSON array of amenities

**Dual Purpose:**
- Instant rides (taxi/bike)
- Rental bookings (rental_car/commercial)

---

## 4. RIDE MANAGEMENT (2 Tables)

### `rides`
**Purpose:** All instant ride bookings (taxi, bike, commercial)

**Key Fields:**

**Location Data:**
- Pickup: address, latitude, longitude, landmark
- Drop: address, latitude, longitude, landmark

**Scheduling:**
- `scheduled_date`, `scheduled_time`: Booking time
- `pickup_datetime`, `start_datetime`, `end_datetime`: Actual times

**Pricing Breakdown:**
- `base_fare`: Minimum charge
- `distance_fare`: Per km charge
- `time_fare`: Per minute charge
- `tax_amount`: GST/taxes
- `discount_amount`: Promo discounts
- `total_fare`: Final amount

**Status Tracking:**
- pending → accepted → started → completed
- Can also be cancelled or no_show

**Security:**
- `otp_code`: Passenger verifies driver at pickup

### `rental_bookings`
**Purpose:** Vehicle rental bookings (hourly/daily)

**Key Fields:**
- `start_date`, `end_date`: Rental period
- `rental_duration_hours`, `rental_duration_days`: Calculated duration
- `security_deposit`: Refundable deposit
- `pickup_location`, `return_location`: Where vehicle is collected/returned
- `rental_agreement_url`: Legal document

**Different from Rides:**
- Longer duration
- Customer drives the vehicle
- Requires deposit
- May need agreement

---

## 5. RIDE TRACKING & LOCATION (1 Table)

### `ride_tracking`
**Purpose:** Real-time GPS tracking during active rides

**Key Fields:**
- `driver_latitude`, `driver_longitude`: Current position
- `speed_kmph`: Current speed
- `eta_minutes`: Estimated time to pickup/destination
- `distance_to_pickup_km`: Real-time distance
- `recorded_at`: Timestamp for each location update

**Use Cases:**
- Live tracking on passenger app
- ETA calculation
- Route history for disputes
- Analytics on driver behavior

**Update Frequency:**
- Every 5-10 seconds during active ride
- Stored for historical record

---

## 6. PAYMENTS (2 Tables)

### `payments`
**Purpose:** All financial transactions

**Key Fields:**
- `transaction_type`: ride, rental, payout, refund
- `payment_method`: cash, upi, wallet, card, netbanking
- `payment_status`: pending, completed, failed, refunded
- `transaction_id`: Gateway reference
- `gateway_response`: JSON of payment gateway data

**Flow:**
1. Ride/rental completed
2. Payment initiated
3. Gateway processes
4. Status updated
5. Confirmation sent

### `partner_earnings`
**Purpose:** Track partner income and commission

**Key Fields:**
- `gross_amount`: Total fare
- `commission_percentage`: Platform cut (default 15%)
- `commission_amount`: Calculated commission
- `net_earnings`: Partner receives
- `payout_status`: pending → processing → completed

**Payout Cycle:**
- Weekly or monthly settlements
- Minimum threshold for payout
- Bank account required

---

## 7. RATINGS & REVIEWS (1 Table)

### `ratings_reviews`
**Purpose:** Feedback system for quality control

**Key Fields:**
- `review_type`: ride, rental, driver, vehicle
- `rating`: 1-5 stars (integer)
- `review_text`: Optional written feedback
- `review_tags`: JSON array of quick tags ["Clean", "Polite", "On Time"]
- `response_text`: Partner can respond to reviews

**Dual Direction:**
- Passengers rate drivers/vehicles
- Drivers can rate passengers (separate records)

**Business Impact:**
- Affects partner ratings
- Used for quality assurance
- Can lead to warnings/suspensions

---

## 8. NOTIFICATIONS (2 Tables)

### `notifications`
**Purpose:** In-app notification center

**Key Fields:**
- `notification_type`: Categorizes notification
- `title`, `message`: Notification content
- `data`: JSON for deep linking to specific screens
- `is_read`: Track read status

**Types:**
- ride_request: New booking for driver
- ride_accepted: Confirmation for passenger
- ride_started, ride_completed: Status updates
- payment: Payment confirmations
- promotion: Marketing messages

### `push_tokens`
**Purpose:** Device registration for push notifications

**Key Fields:**
- `device_token`: FCM/APNS token
- `device_type`: android or ios
- `is_active`: Deactivated when user logs out

**Usage:**
- Send real-time alerts
- Multi-device support
- One user can have multiple devices

---

## 9. SUPPORT & HELP (2 Tables)

### `support_tickets`
**Purpose:** Customer service ticket system

**Key Fields:**
- `ticket_type`: Categorize issue type
- `priority`: low, medium, high, urgent
- `status`: open → in_progress → resolved → closed
- `assigned_to`: Admin user handling ticket

**Workflow:**
1. User creates ticket
2. System auto-assigns or admin picks
3. Admin investigates
4. Resolution provided
5. Ticket closed

### `faqs`
**Purpose:** Self-service help content

**Key Fields:**
- `category`: passenger, partner, general, payment, rental
- `question`, `answer`: FAQ content
- `display_order`: Control ordering
- `is_active`: Enable/disable FAQs

**Benefits:**
- Reduces support tickets
- 24/7 availability
- Easy to update

---

## 10. PROMO CODES & OFFERS (2 Tables)

### `promo_codes`
**Purpose:** Discount and promotional campaigns

**Key Fields:**
- `promo_code`: Unique code (e.g., "FIRST50")
- `discount_type`: percentage or fixed
- `discount_value`: Amount/percentage
- `max_discount_amount`: Cap for percentage discounts
- `usage_limit_per_user`: Prevent abuse
- `valid_from`, `valid_until`: Time-bound offers

**Types:**
- First ride discounts
- Seasonal promotions
- Referral rewards
- User-specific offers

### `promo_usage`
**Purpose:** Track promo code redemptions

**Key Fields:**
- Links promo to specific booking
- `discount_applied`: Actual discount given
- `used_at`: Timestamp

**Validation:**
- Check usage limits
- Verify validity period
- Calculate discount

---

## 11. EMERGENCY SOS (2 Tables)

### `emergency_contacts`
**Purpose:** User's trusted contacts for emergencies

**Key Fields:**
- `contact_name`, `contact_phone`: Contact details
- `relationship`: Mother, Father, Friend, etc.
- `is_primary`: Primary emergency contact

**Limits:**
- Typically 2-3 emergency contacts
- Auto-notified during SOS

### `sos_alerts`
**Purpose:** Emergency alert system

**Key Fields:**
- `alert_type`: emergency, safety_concern, accident
- `latitude`, `longitude`: Location when triggered
- `alert_status`: active, acknowledged, resolved

**Trigger Actions:**
1. Notify emergency contacts
2. Alert support team
3. Record GPS location
4. Enable continuous tracking
5. Potentially notify local authorities

---

## 12. ANALYTICS & LOGS (2 Tables)

### `app_sessions`
**Purpose:** User activity tracking

**Key Fields:**
- `device_type`, `app_version`, `os_version`: Technical details
- `session_start`, `session_end`: Session duration
- `duration_seconds`: Calculated engagement time

**Analytics Use:**
- Daily active users (DAU)
- Average session duration
- App version distribution
- Crash reporting correlation

### `search_logs`
**Purpose:** Search behavior analytics

**Key Fields:**
- `search_type`: ride, rental, location
- `pickup_location`, `drop_location`: Search criteria
- `results_count`: How many options shown
- `booking_made`: Conversion tracking

**Business Insights:**
- Popular routes
- Conversion funnel
- Demand forecasting
- Pricing optimization

---

## 13. ADMIN CONFIGURATIONS (1 Table)

### `app_configurations`
**Purpose:** Dynamic app settings without code deployment

**Key Fields:**
- `config_key`: Unique identifier (e.g., "commission_percentage")
- `config_value`: Actual value
- `description`: Explains purpose

**Common Configs:**
- Commission rates
- Cancellation fees
- Tax percentages
- Emergency numbers
- Support contact details
- Feature flags

---

## Key Relationships & Data Flow

### Ride Booking Flow
```
1. User searches (search_logs)
2. Available vehicles shown (vehicles)
3. User books ride (rides)
4. Driver accepts (rides.ride_status)
5. Live tracking starts (ride_tracking)
6. Ride completed (rides.end_datetime)
7. Payment processed (payments)
8. Earnings recorded (partner_earnings)
9. Ratings exchanged (ratings_reviews)
```

### Rental Booking Flow
```
1. User browses vehicles (vehicles)
2. Selects vehicle & duration (rental_bookings)
3. Payment with deposit (payments)
4. Rental agreement generated (rental_bookings.rental_agreement_url)
5. Vehicle picked up (rental_bookings.booking_status = active)
6. Vehicle returned (rental_bookings.booking_status = completed)
7. Deposit refunded (payments)
8. Review submitted (ratings_reviews)
```

### Partner Onboarding Flow
```
1. User registers (users)
2. Selects partner type (partners)
3. Uploads documents (partner_documents)
4. Admin verifies (partner_documents.verification_status)
5. Partner approved (partners.verification_status)
6. Adds vehicles (vehicles)
7. Goes online (partners.is_online)
8. Receives ride requests (rides)
```

---

## Performance Considerations

### Indexed Fields
All frequently queried fields have indexes:
- User phone numbers, emails
- Partner status and type
- Vehicle availability and type
- Ride status and dates
- Payment statuses
- Notification read status

### JSON Fields
Used for flexible data:
- `vehicle_photos`: Array of image URLs
- `features`: Vehicle amenities
- `review_tags`: Quick feedback tags
- `gateway_response`: Payment details
- `data` in notifications: Deep linking info

### Timestamp Tracking
Every table tracks:
- `created_at`: Record creation
- `updated_at`: Last modification
- Additional timestamps for state changes

---

## Security Measures

1. **Authentication:**
   - OTP-based login
   - Time-limited OTP codes
   - Phone number verification

2. **Privacy:**
   - Personal data in restricted tables
   - Document URLs (not stored in DB)
   - Encrypted payment information

3. **Ride Safety:**
   - OTP verification for pickups
   - Live GPS tracking
   - Emergency SOS system
   - Emergency contact notification

4. **Financial Security:**
   - Transaction IDs for audit
   - Gateway response logging
   - Commission calculations recorded
   - Payout status tracking

---

## Scalability Features

1. **Partitioning Ready:**
   - Rides can be partitioned by date
   - Payments can be partitioned by month
   - Tracking data can be archived

2. **Caching Strategy:**
   - Vehicle availability (Redis)
   - Partner online status (Redis)
   - Active ride tracking (Redis)
   - FAQ content (Application cache)

3. **Archive Strategy:**
   - Completed rides older than 1 year
   - Old tracking records
   - Resolved support tickets
   - Old app sessions

---

## Sample Queries

### Get Available Vehicles Near Location
```sql
SELECT v.*, p.rating_average, u.full_name as owner_name
FROM vehicles v
JOIN partners p ON v.partner_id = p.partner_id
JOIN users u ON p.user_id = u.user_id
WHERE v.is_available = TRUE
  AND v.vehicle_type = 'taxi'
  AND p.is_online = TRUE
  AND p.verification_status = 'approved'
ORDER BY v.rating_average DESC;
```

### Partner Daily Earnings
```sql
SELECT 
    DATE(earned_at) as date,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    SUM(net_earnings) as total_net
FROM partner_earnings
WHERE partner_id = ?
  AND earned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(earned_at)
ORDER BY date DESC;
```

### Active Rides for Driver
```sql
SELECT r.*, 
       u.full_name as passenger_name,
       u.phone_number as passenger_phone
FROM rides r
JOIN users u ON r.passenger_id = u.user_id
WHERE r.driver_id = ?
  AND r.ride_status IN ('accepted', 'started')
ORDER BY r.scheduled_datetime ASC;
```

### User Ride History
```sql
SELECT r.*,
       v.manufacturer, v.model, v.number_plate,
       p.rating_average as driver_rating,
       u.full_name as driver_name
FROM rides r
LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
LEFT JOIN partners p ON r.driver_id = p.partner_id
LEFT JOIN users u ON p.user_id = u.user_id
WHERE r.passenger_id = ?
ORDER BY r.created_at DESC
LIMIT 20;
```

---

## Future Enhancements

### Potential New Tables

1. **Referral System:**
   - `referral_codes`
   - `referral_transactions`

2. **Ride Sharing:**
   - `ride_passengers` (multiple passengers per ride)
   - `ride_splits` (split payment)

3. **Subscriptions:**
   - `subscription_plans`
   - `user_subscriptions`

4. **Chat System:**
   - `ride_messages`
   - `support_messages`

5. **Advanced Features:**
   - `favorite_drivers`
   - `blocked_users`
   - `scheduled_rides` (future dated)
   - `route_templates` (frequent routes)

---

## Conclusion

This database schema provides a solid foundation for a full-featured taxi and vehicle rental platform. It supports:

✅ User and partner management
✅ Real-time ride booking and tracking
✅ Vehicle rental system
✅ Payment processing
✅ Rating and review system
✅ Emergency safety features
✅ Comprehensive analytics
✅ Customer support system
✅ Promotional campaigns

The schema is designed to be:
- **Scalable**: Handles growing data
- **Flexible**: JSON fields for evolving needs
- **Secure**: Proper authentication and privacy
- **Performant**: Well-indexed and optimized
- **Maintainable**: Clear structure and documentation
