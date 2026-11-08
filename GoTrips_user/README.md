# GoTrip User App

The customer app, built with Expo SDK 55 + expo-router. It keeps the original GoTrip look (red header, five tabs), and every screen is now connected to the real API.

## Run

```bash
npm install            # .npmrc sets legacy-peer-deps
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000/api/v1
npx expo start
```

## Features

- **Browse without an account.** Login (phone → OTP → name, all in one modal) is only asked for when booking, calling, or opening "My bookings", and it returns the user to the screen they were on.
- **Trips:** search from/to (server suggestions + saved places + free text), today/tomorrow/date/any day, number of seats, start/return filter. Search matches intermediate stops, and fares are calculated per segment.
- **Trip details:** tap the stop to get on and the stop to get off, choose seats, add a message, send a booking request, and call or WhatsApp the driver.
- **Booking details:** live status, a full number plate once confirmed, the driver's live location in **Google Maps** (when shared), call/WhatsApp, cancel, "find another trip".
- **Rentals:** filter by district or "near me" (GPS), availability, self-drive/with driver and vehicle type. The details page shows rent, deposit, terms and the pickup location in Google Maps, plus call/WhatsApp buttons for the owner.
- **Drivers marketplace:** filter by area, work type, vehicle and verified-only. The full profile shows experience, licence class/validity, languages, pay and verified documents, with call/WhatsApp buttons.
- **Account:** profile, saved places, notifications (FCM push with deep links), help & support (FAQs + tickets), log out, delete account.
- **Goods transport:** screens exist but stay hidden until the admin enables the feature.

There are no embedded map SDKs (and so no paid Maps API key). All maps open in the Google Maps app through free deep links.
