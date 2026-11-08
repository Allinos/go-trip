# GoTrip API

The Node.js + Express 5 + Prisma + PostgreSQL backend for the **User app**, the **Partner app** and the **Admin panel**.

## Quick start

```bash
cp .env.example .env            # fill in DATABASE_URL and the secrets
npm install
npx prisma migrate deploy       # create tables + indexes
npm run seed                    # partner types, required documents, Assam districts, FAQs
npm run admin:create -- --email you@company.com --name "Your Name" --role super_admin
npm run dev                     # http://localhost:3000/health
npm test                        # integration tests (needs a local Postgres; uses database gotrip_test)
```

In development (`SMS_PROVIDER=console`), `POST /auth/otp/send` includes the OTP in the response as `devOtp`, and the server log prints it too.

## Architecture

```
app.js / server.js            HTTP setup, security headers, CORS, raw-body Razorpay webhook, graceful shutdown
src/config/env.js             validated environment (refuses to boot on bad config)
src/lib/                      prisma client, logger (pino, redacts secrets), cache (memory or Redis), validation (zod), JWT, helpers
src/middleware/               auth (user / partner / admin RBAC), rate limits, uploads, error handler
src/services/                 storage (S3/R2/local + sharp image compression), sms, email (SMTP), push (FCM), razorpay, notify, settings
src/modules/                  feature modules (routes + logic)
  auth.js                     OTP login, refresh-token rotation with reuse detection, logout
  users.js                    /me profile, photo, account deletion, push tokens, notifications, saved places, tickets
  partners/service.js         onboarding state machine (resume anywhere) + driver listing sync
  partners/routes.js          register, documents, driver profile, dashboard, earnings, live location
  vehicles.js                 partner vehicles (verification, ON/OFF, rental settings, photos, docs) + public rentals
  trips.js                    start/return trips with ordered stops, search by any stop pair
  bookings.js                 booking requests, accept/reject with atomic seat reservation, shared location
  payments.js                 Razorpay registration fee: order, hosted checkout, verify, webhook, reconciliation
  marketplace.js              public driver marketplace + call tracking
  reviews.js                  passenger ratings of completed trips (one per booking, editable), partner averages
  goods.js                    goods transport orders (built, DISABLED by the goods_orders_enabled flag)
  catalog.js                  /config, categories, districts/places, FAQs
  admin/                      complete admin API (dashboard, verification queues, payments, settings, RBAC, audit log)
src/jobs/scheduler.js         expiry/auto-complete/reconciliation jobs (Postgres advisory locks, so they're safe in a cluster)
prisma/schema.prisma          data model; prisma/migrations has extra SQL: trigram indexes, CHECK constraints, partial unique index
```

All responses use one shape: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

## Key flows

### Partner onboarding (resumable)
`profile (name)` → `category` → `details` → `documents` → `payment` (only when the category has a fee) → **active**

The state is computed from stored data (`GET /partner/onboarding` → `nextStep`). A partner who quits midway resumes at the right step the next time they log in. Partner types and the documents each type needs are stored in the database, and the admin edits them under **Admin → Partner types**. Seeded types:

| code | Name | Fee | Can |
|---|---|---|---|
| `driver` | Driver | ₹499 / 365 days | marketplace profile |
| `taxi` | Taxi / Passenger vehicle owner | free | vehicles, start/return trips |
| `rental` | Car rental provider | free | vehicles, rentals, trips |
| `commercial` | Commercial vehicle / Fleet owner | free | vehicles, trips, goods orders (disabled) |

### Registration fee (Razorpay)
1. `POST /partner/payments/registration-order`: the server computes the amount from the category and creates a Razorpay order. A recent unpaid order is reused, so retries don't create duplicates.
2. The app opens the returned `checkoutUrl` in a WebView. This hosted Razorpay Checkout page works in Expo Go, with no native module needed.
3. `POST /partner/payments/verify` checks the HMAC signature, then **fetches the payment from Razorpay** and confirms the order id, the amount and `captured` status.
4. `POST /payments/webhook/razorpay` (configure it in the Razorpay dashboard) does the same check server-to-server, so the payment still completes when the app closes mid-payment. Each webhook event is processed only once.
5. A job reconciles any orders still unpaid after 5 minutes.

On success: `feePaidAt` and `listingExpiresAt` are set, onboarding completes, the driver is **listed on the marketplace**, and a receipt goes out by push and email.

### Vehicles and verification
New or edited vehicles are `pending`. Changing the registration number, class, make, model or year re-submits the vehicle. Only `approved` vehicles appear publicly or can be used for trips. Partners can switch a vehicle and its rental availability ON/OFF at any time.

### Trips (Start and Return)
A trip has ordered stops (origin, intermediate points, destination) with optional per-stop fares. Search matches any `from` stop that comes **before** a `to` stop, so a passenger from an intermediate town finds the trip. `POST /partner/trips/:id/return-trip` creates the reversed trip in one tap. Booking requests notify the partner (FCM + optional SMS). On accept, seats are reserved with a single conditional `UPDATE`, so concurrent accepts can never overbook.

### Live location (no paid tracking service)
The partner app posts its position every ~30 s while sharing (the server accepts at most one update per 10 s). Only the latest point is stored. Passengers with an **accepted** booking see it with a Google Maps link (`https://www.google.com/maps/search/?api=1&query=lat,lng`). Sharing ends automatically after the chosen time.

### Ratings & reviews
After a trip is completed the passenger can rate it from the booking (`PUT /bookings/:id/review`, 1–5 stars + optional comment, editable). The partner's average and count are stored on the partner and appear on search results and trip pages, with the latest reviews. Partners see their reviews under `GET /partner/reviews` and on the dashboard. Admins can hide abusive reviews (Admin → Reviews); hidden reviews stop counting at once.

### Passenger notifications for trip changes
Passengers with a pending or confirmed booking are notified when the partner changes the departure time or the fare. Requests the partner never answered are expired with a notification when the trip starts, completes, or leaves (scheduler). A vehicle that an admin suspends or rejects disappears from search at once, and its trips stop taking bookings.

### Earnings
Estimates only, calculated from accepted and completed booking fares. No payouts, wallets or bank details exist anywhere in the system.

### Goods orders
Built but **disabled**. Every route returns `403 FEATURE_DISABLED` until a super admin turns on `goods_orders_enabled` in Admin → Settings. The apps read `GET /config → features.goodsOrders`.

## Security
- OTPs are HMAC-hashed and expire. Brute force is blocked three ways: a per-code attempt lock, IP+phone rate limits, a 30 s resend gap and 10 codes per day. Each code can be used only once.
- Short-lived access JWTs (30 min) with separate audiences for user, partner and admin. Refresh tokens are stored as SHA-256 hashes, rotated on every use, and replay revokes all of the user's sessions.
- Admin auth: bcrypt passwords, separate secret, `tokenVersion` invalidation, and three roles (`super_admin` / `admin` / `support`). Every admin action is written to the audit log.
- Every input is validated with zod (unknown fields are dropped). Prisma parameterises every query, including the raw SQL.
- Uploads: type allow-list, magic-byte check, size limit, images re-encoded (EXIF/GPS stripped). All files are private and served only through expiring signed URLs.
- Phone numbers on public listings are shown only to logged-in users, and each "Call" tap is recorded.
- Helmet, a CORS allow-list, rate limits, a 1 MB JSON limit, request ids, redacted logs, and Play Store-compliant account deletion.

## Scaling to 20k+ users
- **One server is enough to start.** A 2 vCPU / 4 GB VM can serve this load easily. Run `pm2 start server.js -i max` (cluster mode).
- **Postgres:** set `connection_limit` in `DATABASE_URL` so that workers × limit stays under `max_connections`. Add PgBouncer if you go multi-server. Hot queries have composite, partial and trigram indexes.
- **Redis (optional):** set `REDIS_URL` to share the cache across workers. Categories, settings, districts and listing pages are cached with short TTLs, so they reach the database rarely.
- **Files:** use `STORAGE_DRIVER=s3` with Cloudflare R2 (no egress fees) or S3 once you run more than one server. Images are compressed to roughly 100–300 KB.
- **Background jobs:** they use advisory locks, so running several instances is safe.

## Cost-effective providers
- SMS: Fast2SMS or MSG91 (DLT-registered OTP template).
- Email: Amazon SES SMTP (about $0.10 per 1,000 emails) or the Brevo free tier.
- Push: FCM (free).
- Maps: Google Maps deep links (free). No paid Maps API is required.
