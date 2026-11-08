# RideFlow - Entity Relationship Diagram (ERD)

## Visual Representation Guide

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RIDEFLOW DATABASE ERD                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    USERS     │ (Central Entity)
│──────────────│
│ user_id (PK) │────────┬─────────────┬──────────────┬─────────────┐
│ phone_number │        │             │              │             │
│ full_name    │        │             │              │             │
│ email        │        │             │              │             │
│ user_type    │        │             │              │             │
└──────────────┘        │             │              │             │
                        │             │              │             │
            ┌───────────┴──┐    ┌─────▼────┐   ┌────▼─────┐  ┌───▼──────┐
            │   PARTNERS   │    │  RIDES   │   │ PAYMENTS │  │ REVIEWS  │
            │──────────────│    │──────────│   │──────────│  │──────────│
            │partner_id(PK)│    │ride_id   │   │payment_id│  │review_id │
            │user_id (FK)  │    │passenger │   │payer_id  │  │reviewer  │
            │partner_type  │    │driver_id │   │amount    │  │rating    │
            │is_online     │    │vehicle_id│   │method    │  │text      │
            │rating_avg    │    │status    │   │status    │  └──────────┘
            └──────┬───────┘    │fare      │   └──────────┘
                   │            └────┬─────┘
                   │                 │
          ┌────────▼─────┐    ┌──────▼────────┐
          │  VEHICLES    │    │ RIDE_TRACKING │
          │──────────────│    │───────────────│
          │vehicle_id(PK)│    │tracking_id    │
          │partner_id(FK)│    │ride_id (FK)   │
          │vehicle_type  │    │latitude       │
          │number_plate  │    │longitude      │
          │is_available  │    │eta_minutes    │
          │rental_prices │    │recorded_at    │
          └──────┬───────┘    └───────────────┘
                 │
        ┌────────▼──────────┐
        │ RENTAL_BOOKINGS   │
        │───────────────────│
        │booking_id (PK)    │
        │passenger_id (FK)  │
        │vehicle_id (FK)    │
        │owner_id (FK)      │
        │start/end dates    │
        │total_amount       │
        └───────────────────┘
```

## Relationship Details

### One-to-Many Relationships

**users → partners**
- One user can be one partner
- One user can have multiple saved locations
- One user can create multiple rides
- One user can make multiple payments

**partners → vehicles**
- One partner can own/operate multiple vehicles
- One vehicle belongs to one partner

**rides → ride_tracking**
- One ride has multiple tracking points
- Each tracking point belongs to one ride

**users → ratings_reviews**
- One user can give multiple reviews
- One user (driver/owner) can receive multiple reviews

### Many-to-Many (through junction tables)

**users ↔ promo_codes** (via promo_usage)
- One user can use multiple promo codes
- One promo code can be used by multiple users

**vehicles ↔ rides**
- One vehicle can have multiple rides
- (Not truly M:M, as one ride uses one vehicle)

---

# API Endpoint Suggestions

## User App (RideFlow) - API Endpoints

### Authentication
```
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/logout
GET    /api/auth/refresh-token
```

### User Profile
```
GET    /api/user/profile
PUT    /api/user/profile
POST   /api/user/profile/photo
GET    /api/user/saved-locations
POST   /api/user/saved-locations
PUT    /api/user/saved-locations/:id
DELETE /api/user/saved-locations/:id
```

### Ride Search & Booking
```
POST   /api/rides/search
POST   /api/rides/book
GET    /api/rides/:id
PUT    /api/rides/:id/cancel
GET    /api/rides/active
GET    /api/rides/history
GET    /api/rides/:id/tracking
POST   /api/rides/:id/verify-otp
```

### Vehicle Rental
```
GET    /api/rentals/vehicles/search
GET    /api/rentals/vehicles/:id
POST   /api/rentals/book
GET    /api/rentals/:id
PUT    /api/rentals/:id/cancel
GET    /api/rentals/active
GET    /api/rentals/history
```

### Payments
```
POST   /api/payments/initiate
POST   /api/payments/verify
GET    /api/payments/history
POST   /api/payments/add-card
GET    /api/payments/methods
```

### Ratings & Reviews
```
POST   /api/reviews/ride/:rideId
POST   /api/reviews/rental/:rentalId
GET    /api/reviews/driver/:driverId
GET    /api/reviews/vehicle/:vehicleId
```

### Promo Codes
```
POST   /api/promo/validate
POST   /api/promo/apply
GET    /api/promo/available
```

### Notifications
```
GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all
POST   /api/notifications/register-device
DELETE /api/notifications/device/:token
```

### Emergency SOS
```
POST   /api/emergency/contacts
GET    /api/emergency/contacts
PUT    /api/emergency/contacts/:id
DELETE /api/emergency/contacts/:id
POST   /api/emergency/trigger-sos
PUT    /api/emergency/sos/:id/resolve
```

### Support
```
POST   /api/support/tickets
GET    /api/support/tickets
GET    /api/support/tickets/:id
POST   /api/support/tickets/:id/message
GET    /api/support/faqs
```

---

## Partner App (RideFlow Partner) - API Endpoints

### Partner Authentication
```
POST   /api/partner/auth/send-otp
POST   /api/partner/auth/verify-otp
POST   /api/partner/auth/select-type
POST   /api/partner/auth/logout
```

### Partner Profile & Verification
```
GET    /api/partner/profile
PUT    /api/partner/profile
POST   /api/partner/documents/upload
GET    /api/partner/documents
GET    /api/partner/verification-status
PUT    /api/partner/bank-details
```

### Online Status
```
PUT    /api/partner/status/online
PUT    /api/partner/status/offline
GET    /api/partner/status
```

### Vehicle Management
```
GET    /api/partner/vehicles
POST   /api/partner/vehicles
PUT    /api/partner/vehicles/:id
DELETE /api/partner/vehicles/:id
PUT    /api/partner/vehicles/:id/availability
POST   /api/partner/vehicles/:id/photos
```

### Ride Management (For Drivers)
```
GET    /api/partner/rides/incoming
POST   /api/partner/rides/:id/accept
POST   /api/partner/rides/:id/reject
POST   /api/partner/rides/:id/start
POST   /api/partner/rides/:id/complete
GET    /api/partner/rides/active
GET    /api/partner/rides/history
POST   /api/partner/rides/:id/location-update
```

### Create Ride/Listing
```
POST   /api/partner/rides/create
PUT    /api/partner/rides/:id
DELETE /api/partner/rides/:id
```

### Rental Management (For Vehicle Owners)
```
GET    /api/partner/rentals/requests
POST   /api/partner/rentals/:id/accept
POST   /api/partner/rentals/:id/reject
GET    /api/partner/rentals/active
GET    /api/partner/rentals/history
POST   /api/partner/rentals/:id/start
POST   /api/partner/rentals/:id/complete
```

### Earnings & Payouts
```
GET    /api/partner/earnings/today
GET    /api/partner/earnings/weekly
GET    /api/partner/earnings/monthly
GET    /api/partner/earnings/history
POST   /api/partner/earnings/request-payout
GET    /api/partner/payouts
GET    /api/partner/payouts/:id/download
```

### Ratings & Performance
```
GET    /api/partner/ratings
GET    /api/partner/reviews
GET    /api/partner/performance
POST   /api/partner/reviews/:id/respond
```

### Partner Support
```
POST   /api/partner/support/tickets
GET    /api/partner/support/tickets
POST   /api/partner/support/report-issue
GET    /api/partner/support/faqs
```

---

## Admin Panel - API Endpoints

### User Management
```
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id/suspend
PUT    /api/admin/users/:id/activate
```

### Partner Management
```
GET    /api/admin/partners
GET    /api/admin/partners/pending-verification
PUT    /api/admin/partners/:id/verify
PUT    /api/admin/partners/:id/reject
GET    /api/admin/partners/:id/documents
PUT    /api/admin/partners/:id/documents/:docId/verify
```

### Ride & Rental Monitoring
```
GET    /api/admin/rides
GET    /api/admin/rides/live
GET    /api/admin/rides/:id
PUT    /api/admin/rides/:id/cancel
GET    /api/admin/rentals
GET    /api/admin/rentals/:id
```

### Payments & Earnings
```
GET    /api/admin/payments
GET    /api/admin/payouts/pending
POST   /api/admin/payouts/:id/process
GET    /api/admin/financials/summary
```

### Support Management
```
GET    /api/admin/tickets
GET    /api/admin/tickets/:id
PUT    /api/admin/tickets/:id/assign
PUT    /api/admin/tickets/:id/resolve
POST   /api/admin/tickets/:id/message
```

### Promo Code Management
```
GET    /api/admin/promos
POST   /api/admin/promos
PUT    /api/admin/promos/:id
DELETE /api/admin/promos/:id
GET    /api/admin/promos/:id/usage
```

### Analytics & Reports
```
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/rides
GET    /api/admin/analytics/revenue
GET    /api/admin/analytics/partners
GET    /api/admin/analytics/users
POST   /api/admin/reports/generate
```

### Emergency Monitoring
```
GET    /api/admin/sos/active
GET    /api/admin/sos/history
PUT    /api/admin/sos/:id/acknowledge
```

### Configuration
```
GET    /api/admin/config
PUT    /api/admin/config/:key
GET    /api/admin/faqs
POST   /api/admin/faqs
PUT    /api/admin/faqs/:id
DELETE /api/admin/faqs/:id
```

---

## WebSocket Events (Real-time)

### For Users
```
ride:status-update          → Ride status changed
ride:driver-assigned        → Driver accepted ride
ride:driver-location        → Live driver location
ride:eta-update             → Updated ETA
payment:status              → Payment status update
notification:new            → New notification
```

### For Partners
```
ride:new-request            → New ride request received
ride:cancelled              → Passenger cancelled
rental:new-request          → New rental request
booking:confirmed           → Booking confirmed
earnings:updated            → New earnings added
```

### For Admin
```
sos:triggered               → Emergency alert
partner:registered          → New partner signup
ride:dispute                → Ride dispute raised
payment:failed              → Payment failure
```

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-02-10T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "The OTP entered is incorrect",
    "details": null
  },
  "timestamp": "2026-02-10T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2026-02-10T10:30:00Z"
}
```

---

## API Authentication

### JWT Token Structure
```
Header: Authorization: Bearer <token>

Token Payload:
{
  "userId": 12345,
  "userType": "passenger",
  "partnerId": null,
  "iat": 1707567000,
  "exp": 1707653400
}
```

### Refresh Token Flow
```
1. Access token expires (1 hour)
2. Client calls /api/auth/refresh-token with refresh token
3. Server validates refresh token (30 days validity)
4. Server issues new access token
5. Client updates stored token
```

---

## Rate Limiting

```
Authentication endpoints: 5 requests per minute
Search endpoints: 20 requests per minute
Booking endpoints: 10 requests per minute
General endpoints: 100 requests per minute
Admin endpoints: 200 requests per minute
```

---

## API Versioning

```
/api/v1/...  (Current)
/api/v2/...  (Future)

Version in header:
Accept: application/vnd.rideflow.v1+json
```

---

## Status Codes Used

```
200 OK                  → Successful GET, PUT
201 Created             → Successful POST
204 No Content          → Successful DELETE
400 Bad Request         → Invalid input
401 Unauthorized        → Missing/invalid token
403 Forbidden           → Valid token, insufficient permissions
404 Not Found           → Resource not found
409 Conflict            → Duplicate/conflict
422 Unprocessable       → Validation error
429 Too Many Requests   → Rate limit exceeded
500 Internal Error      → Server error
503 Service Unavailable → Maintenance
```

---

## Sample API Calls

### 1. Search for Rides
```bash
POST /api/rides/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "pickup": {
    "latitude": 26.1445,
    "longitude": 91.7362,
    "address": "Paltan Bazaar, Guwahati"
  },
  "drop": {
    "latitude": 26.1854,
    "longitude": 91.7517,
    "address": "Airport, Guwahati"
  },
  "vehicleType": "taxi",
  "scheduledDate": "2026-02-10",
  "scheduledTime": "14:30",
  "seats": 2
}

Response:
{
  "success": true,
  "data": {
    "rides": [
      {
        "rideId": "R12345",
        "driver": {
          "name": "Rajesh Kumar",
          "rating": 4.8,
          "photo": "url"
        },
        "vehicle": {
          "type": "Sedan",
          "model": "Honda City",
          "numberPlate": "AS01AB1234",
          "photo": "url"
        },
        "fare": {
          "base": 50,
          "distance": 80,
          "tax": 13,
          "total": 143
        },
        "distance": 12.5,
        "duration": 25
      }
    ]
  }
}
```

### 2. Partner Goes Online
```bash
PUT /api/partner/status/online
Authorization: Bearer <token>

{
  "vehicleId": "V123",
  "currentLocation": {
    "latitude": 26.1445,
    "longitude": 91.7362
  }
}

Response:
{
  "success": true,
  "data": {
    "status": "online",
    "since": "2026-02-10T10:30:00Z",
    "vehicleId": "V123"
  }
}
```

### 3. Track Ride Location
```bash
GET /api/rides/R12345/tracking
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "rideId": "R12345",
    "status": "started",
    "driver": {
      "location": {
        "latitude": 26.1500,
        "longitude": 91.7400
      },
      "heading": 45,
      "speed": 35
    },
    "eta": 15,
    "distanceRemaining": 5.2
  }
}
```

---

This API structure provides a complete backend interface for both mobile apps and admin panel!
