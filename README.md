# Kisumu Stays — professional website + secure M-Pesa integration starter

This package contains the responsive Kisumu Stays website, the five supplied property listings and their 16 local photos, booking-request UI, server-side Safaricom Daraja STK Push functions, a Supabase booking/payment database schema, privacy/booking-terms starter pages, and deployment instructions.

## Important: payment activation is not complete yet

The code is prepared, but real payments will **not** work until the owner configures a Supabase project, a Safaricom Daraja app and an approved business PayBill/Till, then securely adds the credentials as Netlify environment variables. I cannot create those account credentials or approve the merchant account on your behalf. Never paste private keys, passkeys or PINs into this chat.

The contact number **0795 980 628** remains the WhatsApp/contact number. It is **not automatically a PayBill/Till shortcode** and must not be entered as one unless Safaricom has actually issued that shortcode. Secure STK Push must use the approved business shortcode and passkey from the merchant account.

## What is included

- Mobile-friendly property search, filters, property detail view and image thumbnails.
- Fixed local photo paths so the supplied photos load from `site/images/`.
- Booking request form with guest name, Kenyan phone validation, dates, guest capacity and server-calculated estimates.
- Availability-first flow: guests request dates; an authorized operator confirms availability before an M-Pesa prompt can be sent.
- Private operations page at `/admin.html`, protected by an environment-only admin token, for viewing requests, confirming/cancelling requests and triggering STK Push after confirmation.
- Server-side validation: the browser cannot choose its own price or commission.
- Safaricom Daraja OAuth, STK Push initiation, callback handling, STK status query and an admin-only retry-verification action before marking a payment as paid.
- Supabase records for bookings, payment state, M-Pesa receipt and the 10% commission calculation.
- Basic payment-request rate limiting using salted hashes rather than storing raw IP addresses.
- Private server-side environment variables; no Safaricom or Supabase secrets in the public website files.
- Booking terms and privacy starter pages.

## Before going live — complete these steps in order

### 1. Create the database

1. Create a project in [Supabase](https://supabase.com/).
2. Open the project's SQL Editor.
3. Run the full file `docs/supabase-schema.sql`.
4. In Supabase project settings, copy the project URL and the server-side service-role key. Keep the key private. Do not put it in `site/data.js`, HTML, JavaScript, GitHub screenshots or WhatsApp messages.

### 2. Create and test a Daraja app

1. Sign in to the [Safaricom Daraja developer portal](https://developer.safaricom.co.ke/).
2. Create an app and follow Safaricom's current setup instructions for M-Pesa Express / STK Push.
3. Begin with sandbox credentials and test only with the sandbox test setup.
4. For live payments, the business owner needs the appropriate approved PayBill or Till, production Daraja credentials and passkey. Safaricom controls eligibility and production approval.
5. If the owner is not legally eligible to hold the merchant account, a trusted adult/legal business owner must manage the account and credentials. Do not bypass eligibility or identity checks.

### 3. Deploy the project with Netlify Functions

The site must be deployed with its server functions. Do **not** upload only the `site/` folder if you want payments to work.

Recommended route:
1. Put this project folder in a private or appropriately managed GitHub repository. Do not commit any real `.env` file or credentials.
2. In [Netlify](https://app.netlify.com/), create a site by importing that repository.
3. Netlify reads `netlify.toml`: publish directory is `site`, server functions are in `netlify/functions`.
4. Let the first deployment finish and copy the HTTPS site URL assigned by Netlify.
5. Set the callback URL to `https://YOUR-SITE-NAME.netlify.app/.netlify/functions/mpesa-callback` (replace with the exact URL Netlify assigned).

### 4. Add environment variables in Netlify

Open **Site configuration → Environment variables** (wording may change) and add these values there. Do not put them in the source code. Redeploy after changing variables.

- `DARAJA_ENV` = `sandbox` initially; switch to `production` only after Safaricom approves the live setup.
- `DARAJA_CONSUMER_KEY` = key from the Daraja app.
- `DARAJA_CONSUMER_SECRET` = secret from the Daraja app.
- `DARAJA_SHORTCODE` = actual PayBill/Till shortcode issued for the merchant setup.
- `DARAJA_PASSKEY` = the matching Daraja STK passkey.
- `DARAJA_CALLBACK_URL` = the public HTTPS callback URL above.
- `DARAJA_TRANSACTION_TYPE` = `CustomerPayBillOnline` for PayBill. For a Till, follow the current Safaricom instructions and use `CustomerBuyGoodsOnline` if that is the approved transaction type for your setup.
- `ADMIN_ACCESS_TOKEN` = a random private token of at least 32 characters used to access `/admin.html`. Generate it in a password manager, keep it there, and never hardcode it into the website. The operator types it into the admin page when needed.
- `SUPABASE_URL` = your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` = server-only Supabase service-role key.
- `RATE_LIMIT_SALT` = a long random string used only to hash rate-limit identifiers.

Never share these values publicly. If a key is accidentally exposed, rotate it in the provider dashboard immediately.

### 5. Test before accepting real money

- Keep `DARAJA_ENV=sandbox` while testing.
- Test a successful STK flow, a cancelled prompt, a wrong phone number, a failed transaction, a duplicate callback, a delayed status query and an amount mismatch.
- Confirm the booking is marked paid only when Daraja status query succeeds and the paid amount equals the server-calculated total.
- Check the Supabase booking row and payment receipt.
- Confirm failed/pending payments do not appear as paid in any customer-facing confirmation.
- Test on an Android phone and check every listing photo.
- Only switch to production after the merchant account, callback URL, database and policies have been checked.

## Commission and host payouts

The backend calculates a **10% commission** for each booking and stores the amount in the booking record. Example: a KSh 4,500 one-night booking records KSh 450 as platform commission. In this version, the full booking amount is charged to the configured merchant shortcode; the commission is recorded for reconciliation, but host payouts are **not automatically split or sent**. The operator must reconcile completed bookings and pay hosts according to written agreements. Automated split settlement/disbursements require an approved payout setup and additional controls.

## Booking status and business rules

- The payment is not the same as property availability. The host must still confirm the dates and booking.
- Cancellation and refunds are not automated. Use the booking terms and confirm refund policies with each host before launch.
- `/admin.html` is a minimal token-protected operations page, not a full multi-user admin system. Use a unique, long token, enable MFA on Netlify/Supabase/Safaricom accounts, restrict who can access it, and rotate the token if exposed. `commission-dashboard.html` in the project root is an old local prototype outside the deployed `site/` directory; do not publish it or use it for live financial records.
- Update the privacy notice with the legal business identity, contact details, data retention period and any required local disclosures before collecting real customer data.
- Check business-name, tax, consumer-protection and data-protection obligations before public commercial launch.

## Project structure

- `site/` — public website assets and pages.
- `netlify/functions/` — server-side payment endpoints.
- `docs/supabase-schema.sql` — database schema and access restrictions.
- `.env.example` — names of required variables only; contains no real secrets.
- `netlify.toml` — deploy configuration and security headers.

## Business details to edit

In `site/data.js`, update the name, WhatsApp number, email and property details. WhatsApp uses international digits (`254...`). Do not mark properties as verified unless you have actually checked them. Current ratings are set to zero and the website now labels them as not yet rated.


## Dashboard expansion included in this starter

The `site/` folder now includes preview pages for `guest-dashboard.html`, `owner-dashboard.html`, `admin-dashboard.html`, `reviews-dashboard.html`, and `payments-dashboard.html`, plus `dashboard.css`. These are **layout previews**, not connected authenticated dashboards. They deliberately show empty states instead of fabricated customer/payment records.

A starter schema extension is included at `docs/marketplace-schema-extension.sql` for profiles, owner properties, guest reviews, and payment review audit events. Review it carefully and test RLS policies before production. The existing booking/payment endpoints are not yet fully integrated with these new tables or with a complete multi-role authentication flow. Do not represent this package as a fully operational marketplace until that work and end-to-end tests are complete.

### Next implementation steps
1. Deploy through a Git-connected Netlify project so the root `netlify.toml` and `netlify/functions/` are used. A drag-and-drop ZIP deploy does not configure database credentials automatically.
2. Configure Supabase Auth, run both schema SQL files, and test guest/owner/admin roles and RLS with separate accounts.
3. Add authenticated API endpoints for property CRUD, owner booking views, review submission/moderation, and payment review events.
4. Configure Daraja sandbox credentials and callback, verify transaction statuses server-side, then request production approval.
5. Test authorization, payment duplicates/mismatches, refunds, and mobile usability before launch.
