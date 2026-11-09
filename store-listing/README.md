# Google Play store listing

Everything needed for the two Play Store listings: graphics, text, and the answers for the Data safety form. The images were made from real screens of the apps, running on a separate demo database with realistic data.

| | GoTrip (customers) | GoTrip Partner |
|---|---|---|
| Package | `in.gotrip.app` | `in.gotrip.partner` |
| App icon 512×512 | [`user/user-icon-512.png`](user/user-icon-512.png) | [`partner/partner-icon-512.png`](partner/partner-icon-512.png) |
| Feature graphic 1024×500 | [`user/user-feature-graphic-1024x500.png`](user/user-feature-graphic-1024x500.png) | [`partner/partner-feature-graphic-1024x500.png`](partner/partner-feature-graphic-1024x500.png) |
| Phone screenshots 1080×1920 (upload in this order) | `user/user-1-…` to `user-8-…` | `partner/partner-1-…` to `partner-8-…` |
| Category | Travel & Local | Business (or Travel & Local) |

The same icons are installed in the apps (`assets/`), so the launcher icon matches the store icon. The Android adaptive and monochrome (themed) icons are included.

Screenshots, in order:

| # | GoTrip | GoTrip Partner |
|---|---|---|
| 1 | Shared rides across Assam | Your business at a glance |
| 2 | Book from any stop on the route | Accept seat requests in one tap |
| 3 | See the route, stops and fare | Publish trips with stops |
| 4 | Track your driver live | Share your live location |
| 5 | Rent cars, SUVs and buses | Manage all your vehicles |
| 6 | Hire a verified driver | Keep 100% of your fares |
| 7 | Honest ratings from real trips | Build your reputation |
| 8 | Now in Assamese (এতিয়া অসমীয়াতো) | Get hired as a driver |

## GoTrip (customer app)

**App name** (max 30): `GoTrip: Shared Rides & Rentals`

**Short description** (max 80):
```
Shared rides between Assam's towns, car rentals and verified drivers to hire.
```
Assamese:
```
অসমৰ চহৰৰ মাজত শ্বেয়াৰ যাত্ৰা, গাড়ী ভাড়া আৰু পৰীক্ষিত চালক।
```

**Full description:**
```
GoTrip helps you travel between towns in Assam: find a seat in a car going your way, rent a vehicle, or hire a verified driver. Book from any stop on the route and pay the driver directly. No booking fees.

SHARED RIDES BETWEEN TOWNS
• Search any route, such as Nagaon → Guwahati, Jorhat → Guwahati or Tezpur → Guwahati
• Trips passing through your town show up too: book from any stop on the way
• See the full route, departure time, seats left and the fare for your part of the trip
• Send a seat request and get a notification when the driver accepts
• Call or WhatsApp the driver straight from the app
• Track the driver's live location on Google Maps before pickup
• Return trips make it easy to plan both ways

RENT A VEHICLE
• Cars, SUVs, travellers and buses from verified local owners
• Self-drive or with a driver, priced per day or per hour
• See which vehicles are available now, or find vehicles near you
• Call the owner and agree the dates and price directly

HIRE A DRIVER
• Browse driver profiles with experience, licence types, languages and expected pay
• Verified badge for drivers whose documents GoTrip has checked
• Ratings and reviews from customers who hired them
• Call or WhatsApp a driver directly. No agents, no commission

SAFE AND SIMPLE
• Log in with your mobile number (OTP), no password
• Partners and vehicles are verified by our team before they go live
• Confirm the number plate on your booking before boarding
• Rate every trip to help other travellers
• Works in Assamese and English

GoTrip never charges passengers. You pay the fare to the driver in cash or UPI.

Questions? Open Account → Help & support in the app.
```

## GoTrip Partner

**App name**: `GoTrip Partner`

**Short description** (max 80):
```
Publish trips, fill empty seats, rent out vehicles and get hired as a driver.
```
Assamese:
```
যাত্ৰা প্ৰকাশ কৰক, খালী আসন পূৰণ কৰক, বাহন ভাড়াত দিয়ক বা চালক হিচাপে কাম পাওক।
```

**Full description:**
```
GoTrip Partner is the app for drivers, taxi owners, rental providers and fleet owners in Assam. Publish your trips, fill empty seats, rent out vehicles or get hired as a driver. Customers find you and contact you directly, and GoTrip never takes a commission on your fares.

FOR TAXI AND CAR OWNERS
• Publish start and return trips with every stop on the way (Nagaon → Jagiroad → Sonapur → Guwahati)
• Passengers from any stop can request seats, so you fill more seats
• Accept or decline requests in one tap, with instant notifications
• Repeat your daily route in two taps, and create the return trip with one tap
• Share your live location with confirmed passengers on Google Maps
• Start and complete trips; unanswered requests close automatically

FOR RENTAL PROVIDERS
• List cars, SUVs, travellers and buses with photos, prices and terms
• Switch each vehicle ON or OFF at any time to show availability
• Customers call you directly to book

FOR DRIVERS
• Create a marketplace profile with your experience, licences, languages and expected pay
• Get the Verified badge after document checks
• Customers find you and call you directly. No lead fees
• Build your reputation with ratings and reviews

GROW YOUR BUSINESS
• Dashboard with requests, upcoming trips, vehicles and your rating
• Estimated earnings by week, month and vehicle
• Keep 100% of your fares: passengers pay you directly in cash or UPI

EASY REGISTRATION
• Log in with your mobile number (OTP)
• Choose your partner type and upload your documents from your phone
• Our team verifies them, usually within 24 hours
• Some partner types, such as marketplace drivers, pay a yearly listing fee securely through Razorpay

Available in Assamese and English.
```

## Links required by Play Console (from the website)

- Privacy policy: `https://gotrip.in/privacy`
- Account deletion: `https://gotrip.in/delete-account`
- Website: `https://gotrip.in`, support email `support@gotrip.in`

Replace the domain with your real one.

## Data safety form (both apps)

Based on what the apps and backend actually do:

| Data type | Collected | Shared | Purpose | Notes |
|---|---|---|---|---|
| Phone number | Yes (required) | With the other party of a booking or call | Account, app functionality | OTP login |
| Name | Yes (required) | With the other party of a booking | Account, app functionality | |
| Email address | Optional | No | Account, receipts | |
| Photos | Optional (profile photo); Partner: vehicle and document photos | Vehicle photos are public; documents are never shared | App functionality, fraud prevention | Partner app only for documents |
| Precise location | Partner app: only while sharing is switched on. Customer app: optional, for "rentals near me" | Partner: with confirmed passengers | App functionality | Customer location is not stored |
| Purchase history | Partner app: registration fee payments | With Razorpay | App functionality | Card/UPI details are handled by Razorpay only |
| App interactions / diagnostics | Basic logs | No | Security, troubleshooting | |
| Device ID | Push notification token | Firebase Cloud Messaging | Notifications | |

- Data is encrypted in transit: **Yes** (HTTPS).
- Users can request deletion: **Yes**, in the app (Account → Delete account) and through the deletion page.

## Notes for review

- **Location permission (Partner app):** used in the foreground only while the partner chooses to share their location with confirmed passengers. Background location is not used.
- **Test login for Google reviewers:** OTP login needs a number Google can sign in with. Before submitting, create a test account in production that accepts a fixed OTP, and enter it under *App access*.
- **Assamese listing:** use the Assamese short descriptions above if Play Console offers Assamese as a listing language for your account. Otherwise keep the English listing; screenshot 8 already shows the app in Assamese.

## Regenerating the graphics

The scripts in `tools/` rebuild everything after UI changes:

```bash
# 1. Demo database with clean data (never use production)
createdb gotrip_store
cd GoTrips_backend
DATABASE_URL=postgresql://…/gotrip_store npx prisma migrate deploy
DATABASE_URL=postgresql://…/gotrip_store node prisma/seed.js
DATABASE_URL=postgresql://…/gotrip_store node ../store-listing/tools/store-data.js
# 2. Run the API on that database (port 3000) and serve web builds of the apps
#    (user app on :8082, partner app on :8081, built with EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1)
# 3. Capture the screens, then compose
node store-listing/tools/capture.js        # set RATE_BOOKING to Ananya's completed booking id
node store-listing/tools/icons.js
node store-listing/tools/compose.js
```

Headlines and the screenshot order are in the `SLIDES` list in `tools/compose.js`.
