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
                                                                │
                              trip completed ─► passenger rates it (1–5 ★ + comment) ─► stars show on the partner's trips

Drivers: paid listing ─► marketplace ─► users browse and call directly (no lead fees, no commission)
Rentals: listed vehicles with an ON/OFF availability switch ─► users search by area / GPS ─► call the owner
Goods orders: built, switched OFF (Admin → Settings → Goods transport)
```

Money flow: the **only** online payment is the partner registration/listing fee (Razorpay). Trip fares are paid directly to the driver. Earnings in the partner app are estimates.

## Languages (English and Assamese)

- **Apps:** both apps are fully translated (about 830 strings). Users switch with the English | অসমীয়া toggle on the first screen, on Home, or in Account. The choice is saved on the phone and on the server.
- **Server-sent messages:** push notifications, SMS (including the OTP) and emails are sent in each user's saved language. The in-app notification list is re-rendered in the user's current language, so switching language also switches old notifications. Error messages, partner types, document names and FAQs also come back in the language of the request (`Accept-Language`).
- **Admin panel:** has Assamese fields for partner types, required documents and FAQs.
- **Adding text:** wrap new UI text in `t('English text')` and add the Assamese line to `src/i18n/as.json` (Partner app) or `i18n/as.json` (User app). Missing translations fall back to English.

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

## Performance and capacity

**Can it handle 5,000–10,000 users at the same time? Yes.** This was measured, not estimated. The test (`GoTrips_backend/scripts/load-test`) simulates real people: each user does an action every 5–15 seconds (search trips, browse drivers and rentals, open details, check bookings and notifications, book a seat). 10% are partners sending live-location pings and checking their dashboard, and half use Assamese. Setup: one 4-core / 16 GB machine running 4 API workers (PM2-style cluster), Postgres 16 and Redis, plus the load generator itself. Data: 20,000 users, 2,000 partners, 4,000 vehicles, 6,000 trips, 40,000 bookings, 60,000 notifications.

| Users online at once | Requests/s | Errors | Median | 95th percentile | 99th percentile |
|---|---|---|---|---|---|
| 5,000 | ~420 | **0** | 7 ms | 48 ms | 173 ms |
| **10,000** | ~870 | **0** | **7 ms** | **66 ms** | 807 ms |
| 20,000 (stress) | ~1,700 | **0** | 64 ms | 761 ms | 1.6 s |

The load test found and fixed three problems:
- **Search caching:** every booking request wiped all cached trip searches. Invalidation is now precise: a new request changes no seats, an accept clears one trip, and all search pages are cleared only when a trip becomes full or free again. Database CPU went from about 180% to 45%.
- **Rate limiting:** the Redis rate-limit store could fail to load at startup, which would have silently disabled rate limits in cluster mode. It now has its own queued connection.
- **Hot-path overhead:** the cache is now two-level (3 s in process memory, then Redis), and hot listings are stored as ready-made JSON with a precomputed ETag. Trip search uses anchored place matching and no longer contains phone numbers, so logged-in and anonymous users share one cache entry.

**Recommended production setup for 10,000 users online at once:**
- **API server:** 4 vCPU / 8 GB running `pm2 start ecosystem.config.js` (4 workers) behind nginx, with `REDIS_URL` set. Keep workers × `connection_limit` below Postgres `max_connections` (e.g. 4 × 20 = 80 < 100), or add PgBouncer.
- **Database:** managed PostgreSQL with 2 vCPU / 4 GB, with backups and `pg_stat_statements` enabled.
- **Redis:** a small instance (256 MB is plenty).
- **Files:** Cloudflare R2 or S3 (no local disk when running more than one server).
- **Beyond about 15,000 online at once:** add a second identical API server behind the load balancer. Everything (cache, rate limits, background jobs) is already safe with several servers.

Each app also caches screens on the phone (last data shown instantly, refreshed in the background, usable offline) and photos on disk. That cuts repeat requests and makes the apps feel fast on slow mobile networks.
