# Partner API Documentation

This document provides details for the Partner API endpoints in the GoTrips backend.

## Base URL
`{{BACKEND_URL}}/api/partners`

## Authentication
All endpoints require a Bearer token in the Authorization header.
`Authorization: Bearer <your_token>`

---

## 1. Register Partner
Register a new partner profile for the authenticated user.

- **URL**: `/register`
- **Method**: `POST`
- **Access**: Private (Authenticated User)

### Request Body
```json
{
  "partnerType": "taxi_driver", // Options: taxi_driver, bike_rider, vehicle_owner
  "businessName": "My Transport Co"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Partner registration successful. Verification pending.",
  "data": {
    "partner_id": "1",
    "user_id": "100",
    "partner_type": "taxi_driver",
    "business_name": "My Transport Co",
    "verification_status": "pending",
    "user": {
      "user_id": "100",
      "full_name": "John Doe",
      "phone_number": "+919876543210",
      "email": "john@example.com"
    }
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 2. Get Partner Profile
Retrieve a partner's profile by their unique Partner ID.

- **URL**: `/:id`
- **Method**: `GET`
- **Access**: Private (Own profile or Admin)

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "partner_id": "1",
    "user_id": "100",
    "partner_type": "taxi_driver",
    "business_name": "My Transport Co",
    "verification_status": "approved",
    "is_online": true,
    "rating_average": 4.8,
    "user": {
      "user_id": "100",
      "full_name": "John Doe",
      "phone_number": "+919876543210",
      "profile_photo_url": "https://example.com/photo.jpg"
    }
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 3. Toggle Online Status
Switch between online and offline status for the partner.

- **URL**: `/online-status`
- **Method**: `PUT`
- **Access**: Private (Partner)

### Request Body
```json
{
  "isOnline": true // Optional: if omitted, toggles current status
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "You are now online",
  "data": {
    "user_id": "100",
    "is_online": true,
    "user": {
      "full_name": "John Doe"
    }
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 4. Get Partner Statistics
Get a summary of rides, vehicles, and earnings statistics.

- **URL**: `/:id/stats`
- **Method**: `GET`
- **Access**: Private (Partner)

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "rides": {
      "total": 150,
      "completed": 140,
      "cancelled": 5,
      "active": 5
    },
    "vehicles": {
      "total": 2,
      "active": 1,
      "inactive": 1
    },
    "earnings": {
      "total": 25000,
      "pending": 1500,
      "rating": 4.8
    },
    "profile": {
      "verificationStatus": "approved",
      "isOnline": true,
      "partnerType": "taxi_driver"
    }
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 5. Get Partner Rides
List all rides associated with the partner.

- **URL**: `/:id/rides`
- **Method**: `GET`
- **Access**: Private (Partner)
- **Queries**: `page`, `limit`, `status` (pending, accepted, started, completed, cancelled)

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "ride_id": "500",
      "ride_status": "completed",
      "pickup_address": "Indiranagar, Bangalore",
      "drop_address": "Koramangala, Bangalore",
      "total_fare": 450,
      "passenger": {
        "full_name": "Jane Doe",
        "phone_number": "+919000000000"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 140,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 6. Upload Documents
Upload verification documents (RC, License, Aadhaar, etc.).

- **URL**: `/:id/documents`
- **Method**: `POST`
- **Access**: Private (Partner)

### Request Body (Multipart/form-data)
Send files with keys corresponding to document types: `registration_certificate`, `driving_license`, `aadhaar_card`, etc.

### Response (201 Created)
```json
{
  "success": true,
  "message": "Documents uploaded successfully. Verification pending.",
  "data": [
    {
      "document_id": "10",
      "partner_id": "1",
      "document_type": "driving_license",
      "document_url": "https://storage.com/docs/license.jpg",
      "verification_status": "pending"
    }
  ],
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 7. Update Partner Profile
Update optional business and bank details.

- **URL**: `/:id`
- **Method**: `PUT`
- **Access**: Private (Partner)

### Request Body
```json
{
  "businessName": "New Business Name",
  "bankAccountNumber": "123456789012",
  "bankIfscCode": "SBIN0001234",
  "upiId": "john@upi"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Partner profile updated successfully",
  "data": {
    "partner_id": "1",
    "business_name": "New Business Name",
    "bank_account_number": "************9012"
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 8. Get Earnings
Get detailed earning transactions and a summary of gross/net earnings.

- **URL**: `/:id/earnings`
- **Method**: `GET`
- **Access**: Private (Partner)
- **Queries**: `startDate`, `endDate`, `page`, `limit`, `payoutStatus`

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "earnings": [
      {
        "id": "1",
        "grossAmount": 500,
        "commissionAmount": 50,
        "netEarnings": 450,
        "payoutStatus": "completed",
        "earnedAt": "2024-03-10T10:00:00Z",
        "ride": {
          "pickupAddress": "Point A",
          "dropAddress": "Point B",
          "totalFare": 500
        }
      }
    ],
    "summary": {
      "totalEarnings": 5000,
      "totalCommission": 500,
      "netEarnings": 4500,
      "totalTransactions": 10,
      "pendingPayout": 1000
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 9. Get Documents
Retrieve all uploaded documents for a partner.

- **URL**: `/:id/documents`
- **Method**: `GET`
- **Access**: Private (Partner)

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "document_id": "10",
      "document_type": "driving_license",
      "document_url": "https://storage.com/docs/license.jpg",
      "verification_status": "approved",
      "uploaded_at": "2024-03-01T12:00:00Z"
    }
  ],
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 10. Request Payout
Submit a request to withdraw earned balance to the registered bank account.

- **URL**: `/:id/payout-request`
- **Method**: `POST`
- **Access**: Private (Partner)

### Request Body
```json
{
  "amount": 500 // Minimum ₹100
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Payout request submitted. Processing time: 2-3 business days.",
  "data": {
    "partnerId": "1",
    "amount": 500,
    "bankAccount": "************9012",
    "status": "pending",
    "requestedAt": "2024-03-10T15:30:00.000Z"
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## 11. Get All Partners (Admin)
Retrieve a paginated list of all partners with filtering.

- **URL**: `/`
- **Method**: `GET`
- **Access**: Private (Admin)
- **Queries**: `partnerType`, `verificationStatus`, `isOnline`, `search`, `page`, `limit`

### Response (200 OK)
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

---

## Common Response Structure

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Success message", // Optional
  "data": { ... }, // Response data (Object or Array)
  "pagination": { ... }, // Only for list endpoints
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": null // Optional additional info
  },
  "timestamp": "2024-03-10T15:30:00.000Z"
}
```
