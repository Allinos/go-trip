
```

---

## 🤖 **AI Prompts for Different Platforms**

### **📋 Prompt 1: Generate Controllers** (ChatGPT/Claude)
```
I'm building a ride-sharing backend API with Node.js, Express, Prisma, and PostgreSQL.

Create a complete controller file for ride management with these features:
1. Search for available rides (GET /api/rides/search)
   - Input: pickup location, drop location, vehicle type, date, time
   - Output: List of available rides with driver, vehicle, and fare details
   
2. Book a ride (POST /api/rides/book)
   - Input: rideId, passenger details, payment method
   - Output: Booking confirmation with OTP
   
3. Get ride details (GET /api/rides/:id)
   - Output: Complete ride information with tracking

4. Cancel ride (PUT /api/rides/:id/cancel)
   - Input: cancellation reason
   - Output: Cancellation confirmation

5. Get ride history (GET /api/rides/history)
   - Output: Past rides with pagination

Include:
- Proper error handling
- Input validation
- Response standardization
- Comments explaining logic
- Use Prisma for database operations

File path: src/controllers/ride.controller.js
```

### **📋 Prompt 2: Generate Services** (ChatGPT/Claude)
```
Create a Firebase Cloud Messaging (FCM) service for sending push notifications in a Node.js backend.

Requirements:
1. Function to send notification to single device
2. Function to send notification to multiple devices
3. Function to send notification to topic
4. Handle success and failure responses
5. Log all notification attempts

Include:
- Firebase Admin SDK setup
- Error handling
- Retry logic for failed notifications
- TypeScript types (optional)

File path: src/services/fcm.service.js

Environment variables to use:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
```

### **📋 Prompt 3: Generate AWS S3 Upload** (ChatGPT/Claude)
```
Create an AWS S3 file upload service for a Node.js backend using AWS SDK v3.

Features needed:
1. Upload single file to S3
2. Upload multiple files
3. Generate pre-signed URLs for secure uploads
4. Delete files from S3
5. Get file URL

Requirements:
- Use @aws-sdk/client-s3
- Support image and PDF uploads
- File size validation (max 5MB)
- Generate unique filenames
- Organize files in folders (users/, vehicles/, documents/)
- Return public URLs

File path: src/services/s3.service.js

Use environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_S3_BUCKET
```

### **📋 Prompt 4: Generate Middleware** (ChatGPT/Claude)
```
Create JWT authentication middleware for Express.js API.

Requirements:
1. Verify JWT token from Authorization header
2. Extract user information from token
3. Attach user to req.user
4. Handle token expiration
5. Handle invalid tokens
6. Support both access and refresh tokens

Also create:
- Function to generate JWT tokens
- Function to verify tokens
- Function to refresh tokens

File paths:
- src/middleware/auth.middleware.js
- src/utils/jwt.utils.js

Use environment variables:
- JWT_SECRET
- JWT_EXPIRE
- JWT_REFRESH_SECRET
- JWT_REFRESH_EXPIRE
```

### **📋 Prompt 5: Generate Validators** (ChatGPT/Claude)
```
Create request validation middleware using Joi for ride booking API.

Validate:
1. Phone number (with country code)
2. OTP (6 digits)
3. Location coordinates (latitude, longitude)
4. Date and time (future dates only)
5. Vehicle type enum
6. Payment method enum

Create validation schemas for:
- User registration
- Ride booking
- Partner document upload
- Payment initiation

File path: src/validators/

Return validation errors in standardized format.
```

### **📋 Prompt 6: Generate WebSocket Handler** (Cursor/Copilot)
```
Create Socket.IO real-time tracking handler for ride tracking.

Features:
1. User joins ride room
2. Driver sends location updates every 5 seconds
3. Passenger receives real-time location
4. Calculate and emit ETA updates
5. Handle driver offline/online status
6. Emit ride status changes

Events to handle:
- join-ride
- leave-ride
- location-update
- ride-status-change

File path: src/websocket/handlers/tracking.handler.js
```

### **📋 Prompt 7: Generate Prisma Models** (ChatGPT/Claude)
```
Convert this PostgreSQL schema to Prisma schema format:

[Paste your SQL schema here]

Include:
- All tables as models
- Proper data types
- Relations between models
- Indexes
- Default values
- Enums
- Timestamps (createdAt, updatedAt)

Generate for Prisma Client with:
- camelCase field names
- snake_case database columns (@map)
- Proper foreign key constraints
```

### **📋 Prompt 8: Generate API Routes** (ChatGPT/Claude)
```
Create Express.js routes for partner/driver management API.

Routes needed:
POST   /api/partners/register - Register as partner
POST   /api/partners/documents/upload - Upload verification documents
GET    /api/partners/profile - Get partner profile
PUT    /api/partners/profile - Update partner profile
PUT    /api/partners/status - Toggle online/offline
GET    /api/partners/earnings - Get earnings summary
GET    /api/partners/rides - Get ride requests
POST   /api/partners/rides/:id/accept - Accept ride
POST   /api/partners/rides/:id/reject - Reject ride

Include:
- Authentication middleware
- Validation middleware
- Route protection (partners only)
- File upload middleware for documents

File path: src/routes/partner.routes.js
```

### **📋 Prompt 9: Database Migrations** (ChatGPT/Claude)
```
Generate Prisma migration commands to:
1. Create all tables from schema
2. Add indexes for performance
3. Seed initial data (configs, FAQs)

Also create a seed.js file to populate:
- App configurations
- Default FAQs
- Test users (development only)
- Sample promo codes

File path: prisma/seed.js
```

### **📋 Prompt 10: Error Handler** (ChatGPT/Claude)
```
Create a centralized error handling middleware for Express.js.

Handle:
- Validation errors (Joi)
- Database errors (Prisma)
- JWT errors
- File upload errors
- Payment gateway errors
- Custom API errors

Return standardized error response:
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "details": {...}
  },
  "timestamp": "ISO date"
}

File path: src/middleware/error.middleware.js














rideflow-mobile-api/
│
├── src/
│   ├── config/
│   │   ├── database.js              # PostgreSQL connection
│   │   ├── firebase.js              # Firebase Admin SDK config
│   │   ├── aws.js                   # AWS S3 configuration
│   │   ├── app.config.js            # General app settings
│   │   └── constants.js             # App constants
│   │
│   ├── controllers/
│   │   ├── auth.controller.js       # OTP, login, signup
│   │   ├── user.controller.js       # User profile, locations
│   │   ├── partner.controller.js    # Partner registration, documents
│   │   ├── ride.controller.js       # Ride booking, search
│   │   ├── rental.controller.js     # Vehicle rental booking
│   │   ├── vehicle.controller.js    # Vehicle management
│   │   ├── payment.controller.js    # Payment processing
│   │   ├── notification.controller.js # Push notifications
│   │   ├── tracking.controller.js   # Live ride tracking
│   │   ├── review.controller.js     # Ratings & reviews
│   │   ├── support.controller.js    # Support tickets
│   │   └── promo.controller.js      # Promo codes
│   │
│   ├── models/
│   │   ├── user.model.js            # User queries
│   │   ├── partner.model.js         # Partner queries
│   │   ├── ride.model.js            # Ride queries
│   │   ├── rental.model.js          # Rental queries
│   │   ├── vehicle.model.js         # Vehicle queries
│   │   ├── payment.model.js         # Payment queries
│   │   ├── notification.model.js    # Notification queries
│   │   └── review.model.js          # Review queries
│   │
│   ├── routes/
│   │   ├── auth.routes.js           # /api/auth/*
│   │   ├── user.routes.js           # /api/users/*
│   │   ├── partner.routes.js        # /api/partners/*
│   │   ├── ride.routes.js           # /api/rides/*
│   │   ├── rental.routes.js         # /api/rentals/*
│   │   ├── vehicle.routes.js        # /api/vehicles/*
│   │   ├── payment.routes.js        # /api/payments/*
│   │   ├── notification.routes.js   # /api/notifications/*
│   │   ├── review.routes.js         # /api/reviews/*
│   │   ├── support.routes.js        # /api/support/*
│   │   └── index.js                 # Main route aggregator
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT authentication
│   │   ├── validation.middleware.js # Request validation
│   │   ├── upload.middleware.js     # File upload (S3)
│   │   ├── rateLimit.middleware.js  # Rate limiting
│   │   ├── error.middleware.js      # Error handler
│   │   └── logger.middleware.js     # Request logging
│   │
│   ├── services/
│   │   ├── otp.service.js           # OTP generation & verification
│   │   ├── sms.service.js           # SMS via Twilio/AWS SNS
│   │   ├── email.service.js         # Email notifications
│   │   ├── fcm.service.js           # Firebase Cloud Messaging
│   │   ├── s3.service.js            # AWS S3 file operations
│   │   ├── payment.service.js       # Razorpay/Stripe integration
│   │   ├── maps.service.js          # Google Maps API
│   │   ├── fare.service.js          # Fare calculation logic
│   │   └── socket.service.js        # WebSocket management
│   │
│   ├── utils/
│   │   ├── jwt.utils.js             # JWT sign/verify
│   │   ├── validator.utils.js       # Custom validators
│   │   ├── response.utils.js        # Standardized responses
│   │   ├── helpers.js               # General helper functions
│   │   ├── logger.js                # Winston logger setup
│   │   └── encryption.utils.js      # Bcrypt, hashing
│   │
│   ├── validators/
│   │   ├── auth.validator.js        # Auth validation schemas
│   │   ├── user.validator.js        # User validation schemas
│   │   ├── ride.validator.js        # Ride validation schemas
│   │   ├── partner.validator.js     # Partner validation schemas
│   │   └── common.validator.js      # Shared validations
│   │
│   ├── websocket/
│   │   ├── handlers/
│   │   │   ├── ride.handler.js      # Ride-related socket events
│   │   │   ├── tracking.handler.js  # Location tracking events
│   │   │   └── notification.handler.js # Real-time notifications
│   │   └── index.js                 # Socket.IO setup
│   │
│   └── jobs/                        # Background jobs (optional)
│       ├── payoutJob.js             # Process partner payouts
│       ├── notificationJob.js       # Scheduled notifications
│       └── cleanupJob.js            # Cleanup old data
│
├── prisma/                          # If using Prisma
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # Auto-generated migrations
│   └── seed.js                      # Database seeding
│
├── database/                        # If NOT using Prisma
│   ├── migrations/                  # SQL migration files
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_partners.sql
│   │   └── ...
│   ├── seeds/                       # Seed data
│   │   └── initial_data.sql
│   └── schema.sql                   # Your complete schema
│
├── tests/
│   ├── unit/
│   │   ├── auth.test.js
│   │   ├── ride.test.js
│   │   └── payment.test.js
│   ├── integration/
│   │   └── api.test.js
│   └── setup.js
│
├── uploads/                         # Temporary local uploads
│   └── .gitkeep
│
├── logs/
│   ├── error.log
│   ├── combined.log
│   └── .gitkeep
│
├── .env
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json
├── server.js                        # Main entry point
├── app.js                           # Express app setup
├── ecosystem.config.js              # PM2 configuration
└── README.md