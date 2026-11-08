# GoTrip Admin Panel

The web admin panel for GoTrip, built with React 18 + Vite + TanStack Query. It talks to the GoTrip API (`/api/v1/admin/*`).

## Run

```bash
cp .env.example .env          # VITE_API_URL=https://api.yourdomain.com/api/v1
npm install
npm run dev                   # http://localhost:5173
npm run build                 # static files in dist/ — host on any static host / nginx / S3+CloudFront
```

In the API's `.env`, add the panel's origin to `CORS_ORIGINS` (for example `https://admin.yourdomain.com`). Create the first admin account on the API server:

```bash
cd ../GoTrips_backend && npm run admin:create -- --email you@company.com --name "You" --role super_admin
```

## What admins can do

| Area | Features |
|---|---|
| Dashboard | Users, customers, partners by type, listed drivers, vehicles, trips, bookings, fee revenue, 30-day charts, verification alerts |
| Verification | Partner document queue and vehicle verification queue. Approve or reject each document with a reason, and the partner is notified by push and SMS |
| Users | Search and filter, profile, bookings, tickets, block/unblock (blocking logs the user out everywhere) |
| Partners / Drivers | Filter by type, registration status and verification status. Detail view shows contact info, documents, the driver's marketplace profile, vehicles, payments and stats. Suspend or reactivate, and override listing validity (offline payments) |
| Vehicles | Status tabs, photos, rental details, document review, approve, reject or suspend. Only approved vehicles are public |
| Trips / Bookings | Monitor start and return trips with their stops and booking requests. Cancelling a trip notifies passengers |
| Payments | Razorpay registration fee records, status filters, paid totals, re-check with Razorpay, CSV export |
| Support | Reply to tickets from both apps. The user gets a notification |
| Goods orders | Read-only while the feature is disabled |
| Configuration | Partner types (fee, validity, capabilities, required documents), locations, FAQs, feature flags and settings |
| Admin users / Audit log | Roles: **support** (read + tickets), **admin** (verification and moderation), **super admin** (fees, settings, admins). Every action is logged |

## Security notes
- The token is kept in `sessionStorage` (cleared when the browser closes) and expires after `ADMIN_TOKEN_TTL` (8 h by default).
- Changing an admin's password or role invalidates that admin's existing sessions.
- Document images are served through short-lived signed URLs.
- Serve the panel over HTTPS, ideally on its own subdomain, and keep it out of search engines (`noindex` is already set).
