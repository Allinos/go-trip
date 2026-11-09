# GoTrip Partner App

The Expo (SDK 55, React Native 0.83) app for **drivers, taxi/passenger vehicle owners, car rental providers and commercial fleet owners**.

## Run

```bash
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000/api/v1
npx expo start              # press a for Android
```

In development the API returns the OTP in the response, and the OTP screen shows it as "Test mode".

**Push notifications (FCM)** need a development or production build (`npx expo run:android` or EAS Build) with `google-services.json` from your Firebase project in this folder. Expo Go can't receive FCM pushes on Android.

## What the app does

| Area | Features |
|---|---|
| Login | Phone + OTP with auto-fill, resend timer, and tokens stored in the device keystore with silent refresh |
| Registration (resumable) | Name → partner type (fees and features come from the server) → business details (address and PIN required) **or** driver profile → document uploads (camera/gallery, front/back, number, expiry) → **review & submit** (the partner checks everything and confirms; uploading the last document never opens the dashboard by itself) → Razorpay fee (drivers only). If the partner closes the app, the next login resumes at the same step |
| Payment | Razorpay Checkout in a WebView (UPI apps open natively), server-side verification, "I have paid — check status" recovery, renewal 15 days before expiry, payment history |
| Home dashboard | Verification and rejection notices, availability switch (drivers), estimated earnings, pending requests with one-tap accept/decline/call, vehicle and trip counts, quick actions |
| Vehicles | Category first: **passenger** (seating capacity, AC, comfort extras) or **goods** (load capacity in kg/tonnes, body type, cargo length, goods extras). Manufacturer list, model, manufacturing year, registration number with format check. Photos (up to 8), vehicle documents, ON/OFF switch, rental details. Changing key details re-sends the vehicle for verification. Admins can't approve a vehicle with required documents missing unless they override |
| Trips | Create trip lists every vehicle: verified ones that are ON and set for trips can be chosen; the others show why not ("Waiting for verification", "Switched OFF", "Not set for trips") with a one-tap fix. Goods vehicles publish **goods trips**: the customer hires the whole vehicle for the route (capacity in kg, one hire price). Start trips and return trips. Return trips can be created in one tap with the route reversed, and stops can be added along the way (with optional per-stop fares). Edit, pause bookings, start, complete, cancel (passengers are notified) |
| Bookings | Requests inbox with status tabs, accept/decline with reasons, call or WhatsApp the passenger, cancel confirmed bookings |
| Live location | Share for 1–8 h (optionally tied to a trip). Only passengers with confirmed bookings see it on Google Maps |
| Driver marketplace | Profile preview as customers see it, completeness score, views and call counts |
| Earnings | Estimated earnings (no wallet or payouts): period filter, trend chart, per-vehicle totals, booking history |
| Account | Edit profile/photo, business details, documents, notifications, support tickets + FAQs, log out, delete account |
| Goods orders | Hidden until the admin enables the feature flag |

The tabs depend on the partner type. Drivers see Home · My profile · Account. Taxi, rental and fleet owners see Home · Trips · Bookings · Vehicles · Account.

## UI and Android notes

- The UI kit (`src/components/ui.js`) is built on **react-native-paper** (Material Design 3, the system MUI follows): outlined text fields with floating labels and inline errors, bottom-sheet selects, segmented buttons, choice cards, chips, a horizontal stepper, dialogs and snackbars. Screens use only the kit, so spacing and typography stay consistent.
- Android draws edge-to-edge: the tab bar adds the navigation-bar inset, sheets use translucent status/navigation bars, and screens push the footer above the keyboard.
- Release builds block plain-HTTP requests on Android. `app.config.js` allows cleartext only when `EXPO_PUBLIC_API_URL` starts with `http://` (a LAN test server). Production must use https.

## Structure

```
src/api/            axios client (token refresh, error messages, uploads) + endpoint functions
src/context/        Auth (session + onboarding state machine), Location sharing, Toasts
src/components/     UI kit (Screen, Button, Input, Select, Chips, Stepper, Toggle, Notice…), fields (date, image, district, place autocomplete)
src/navigation/     Auth → Onboarding → Main stacks (tabs depend on partner capabilities)
src/screens/        auth, onboarding, home, trips, bookings, vehicles, driver, account, goods
```
