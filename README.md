# GoTrip

GoTrip is a ride-sharing, vehicle-rental and driver-marketplace platform for Assam. It has four parts:

| Folder | What | Tech |
|---|---|---|
| [`GoTrips_backend`](GoTrips_backend) | API for every app, payments, notifications, background jobs | Node.js 20+, Express 5, Prisma, PostgreSQL, optional Redis |
| [`GoTrips_Partner`](GoTrips_Partner) | **Partner app**: drivers, taxi/passenger vehicle owners, rental providers, fleet owners | Expo SDK 55 (React Native) |
| [`GoTrips_user`](GoTrips_user) | **User app**: customers search trips, request seats, rent vehicles, hire drivers | Expo SDK 55 + expo-router |
| [`GoTrips_admin_panel`](GoTrips_admin_panel) | **Admin panel**: verification, users, partners, payments, settings | React 18 + Vite |

Each folder has its own README with setup steps and the feature list.

## How it works

```
Partner registers (OTP) ─► picks a type ─► details / driver profile ─► uploads documents ─► pays fee (drivers, Razorpay)
        │                                                                                           │
        │                                                       resumable: progress is kept on the server
        ▼
 Adds vehicles ─► admin verifies ─► vehicle is public ─► partner creates Start / Return trips (with stops)
                                                                │
User searches A→B (any stops in order) ─► requests seats ─► partner gets FCM (+SMS) ─► accept / reject ─► user notified
                                                                │
                              partner shares live location ─► confirmed passengers open it in Google Maps

Drivers: paid listing ─► marketplace ─► users browse and call directly (no lead fees, no commission)
Rentals: listed vehicles with an ON/OFF availability switch ─► users search by area / GPS ─► call the owner
Goods orders: built, switched OFF (Admin → Settings → Goods transport)
```

Money flow: the **only** online payment is the partner registration/listing fee (Razorpay). Trip fares are paid directly to the driver. Earnings in the partner app are estimates.

## Local setup (about 10 minutes)

```bash
# 1. Database
createdb gotrip                                   # PostgreSQL 14+

# 2. API
cd GoTrips_backend
cp .env.example .env                              # set DATABASE_URL and the secrets
npm install
npx prisma migrate deploy && npm run seed
npm run seed:demo                                 # optional demo partners, vehicles, trips, bookings
npm run admin:create -- --email you@example.com --name "You"
npm run dev                                       # http://localhost:3000/health
npm test                                          # needs database gotrip_test

# 3. Admin panel
cd ../GoTrips_admin_panel && cp .env.example .env && npm install && npm run dev   # http://localhost:5173

# 4. Apps (set EXPO_PUBLIC_API_URL to http://<your-PC-LAN-IP>:3000/api/v1)
cd ../GoTrips_Partner && npm install && npx expo start
cd ../GoTrips_user && npm install && npx expo start
```

In development, SMS is printed to the API log and the apps show the OTP on screen ("Test mode").

## Production checklist

1. **Server:** Ubuntu VM with 2 vCPU / 4 GB RAM (enough for 20k+ users), Node 20+, PostgreSQL 16 (or a managed DB), nginx + certbot. See `deploy/nginx.conf`.
2. **API:** `NODE_ENV=production`, strong random secrets, `PUBLIC_BASE_URL=https://api.yourdomain`, `CORS_ORIGINS=https://admin.yourdomain`, then `npx prisma migrate deploy && npm run seed && pm2 start ecosystem.config.js --env production`.
3. **Files:** `STORAGE_DRIVER=s3` with Cloudflare R2 (no egress fees) or AWS S3 (ap-south-1). The bucket stays private; the API hands out signed URLs.
4. **Razorpay:** live keys, plus a webhook at `https://api.yourdomain/api/v1/payments/webhook/razorpay` (events `payment.captured`, `payment.failed`, `order.paid`) with `RAZORPAY_WEBHOOK_SECRET`.
5. **SMS:** register a DLT OTP template, then `SMS_PROVIDER=fast2sms` (or `msg91`).
6. **Email:** Amazon SES SMTP credentials with `EMAIL_ENABLED=true` (or Brevo / Gmail app password).
7. **Push:** create a Firebase project, put the service-account values in the API `.env` (`FCM_ENABLED=true`), and put `google-services.json` in both app folders before building.
8. **Apps:** set `EXPO_PUBLIC_API_URL`, change the package ids in `app.json` if needed, then `eas build -p android`.
9. **Admin:** `npm run build` in the admin panel and serve `dist/` from nginx.
10. **Backups:** nightly `pg_dump` (or managed DB snapshots), plus versioning on the storage bucket.
11. **Fees and documents:** review fees and required documents in **Admin → Partner types & fees** (the defaults are seeded).

## Performance

Load-tested on a 4-core machine with 20,000 users, 2,000 partners, 4,000 trips (all on the same corridor, the worst case), 16,000 stops and 30,000 bookings. One Node process, pool size 20, 100 users requesting at once:

| Endpoint | Throughput | Avg latency |
|---|---|---|
| `GET /trips/search` (stop-pair search, 20 results, ~28 KB) | ~1,200 req/s | ~80 ms |
| `GET /marketplace/drivers` | ~3,000 req/s | ~33 ms |
| `GET /rentals` (GPS radius) | ~4,000 req/s | ~25 ms |

Peak load for 20k registered users is typically well under 100 req/s, so one server with PM2 cluster mode has a large safety margin. To grow further: add Redis (`REDIS_URL`) for a shared cache and rate limits, PgBouncer, and a second API server behind the load balancer. Background jobs are already safe to run on several servers.
