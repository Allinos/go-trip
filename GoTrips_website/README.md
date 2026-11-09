# GoTrip website

The public website for GoTrip, built with React and Vite. It uses live data from the same API as the apps.

| Page | What it shows |
|---|---|
| `/` | Hero with trip search, live stats, trips leaving soon, services, how it works, partner pitch, app download |
| `/trips`, `/trips/:id` | Shared-trip search (any stop to any later stop, date, seats, start/return) and trip pages: route timeline, fare for the chosen segment, vehicle, driver rating and reviews, share |
| `/rentals`, `/rentals/:id` | Rentals by district or "near me" (GPS), availability, self-drive or with driver, vehicle type; detail page with photos, prices, deposit, terms, owner rating |
| `/drivers`, `/drivers/:id` | Driver marketplace with search, verified only, "4+ rated" and work type filters; profile with experience, verified documents and reviews |
| `/partners` | Partner types with **live fees and required documents** from the API, how to join, partner FAQs |
| `/help` | FAQs for customers and partners (from the admin panel), support contacts |
| `/about`, `/contact`, `/safety` | Company and safety information |
| `/privacy`, `/terms`, `/refunds` | Legal pages. Razorpay needs these for merchant approval and Google Play needs the privacy policy URL. |
| `/delete-account` | How to delete an account. Google Play requires this page. |

- **Languages:** English and Assamese, switched from the header toggle; the choice is remembered. API content such as partner types, documents and FAQs also comes back in the chosen language. The legal pages are in English only and show a short note in Assamese.
- **What happens in the app:** booking a seat and calling or WhatsApping a driver or owner need an OTP login, so the website sends people to the app for those. Phone numbers are never shown on the website.

## Run

```bash
cp .env.example .env      # set VITE_API_URL, store links and company details
npm install
npm run dev               # http://localhost:5174
npm run build             # static files in dist/
```

Add the website's origin to `CORS_ORIGINS` in the API's `.env`, for example `https://gotrip.in,https://www.gotrip.in`. To deploy, copy `dist/` to the server; `deploy/nginx.conf` has a ready server block with a single-page-app fallback.

Have the legal pages reviewed by a lawyer before launch, and fill in the company name, address and grievance officer details.
