# Checkout, donations and owner dashboard

Prepared 5 November 2026. This update keeps the existing PostgreSQL database, image encryption key, Razorpay keys, paid orders and 24-hour pass behavior.

## Changes

- Selecting a pass or support amount creates the order once and automatically opens the verified Razorpay URL in the same tab. There is no popup dependency. A prominent, high-contrast fallback button replaces the offers at the top of the checkout flow. The editor stays in its original tab when pricing was opened from it.
- Restore codes remain available in Your purchases and an order-details disclosure. Payment confirmation still depends on verified provider information, not browser navigation.
- Donation checkout is available whenever payments are enabled, unless `DONATIONS_ENABLED=false`. The earlier `SUPPORT_PAYMENTS_APPROVED` variable is replaced by `DONATIONS_ENABLED`; it is no longer read. Support remains separate from paid passes, ₹5–₹1,000, without a charity/tax deduction claim. Use a collection model permitted for your merchant account.
- The owner page is `/admin-photoresize-mgrrntech`. The static page contains no private records. Every dashboard request requires a separate authenticated admin session; the path is not the security control. It is noindex and excluded from the sitemap.
- One active owner is seeded from server-only `ADMIN_USERNAME` and `ADMIN_PASSWORD`. No default credentials exist. Passwords are salted scrypt hashes (N=32768, r=8, p=3). Changing either environment value and recreating the API updates the account and revokes affected sessions. Old accounts are disabled. Removing both values disables owner access.
- The owner can view captured amounts, refunds, amounts after refunds but before fees/taxes, support payments, and paginated orders with checkout email and provider references. Live and test values are clearly separated. Payment-period filters use order creation dates; usage-period filters use the UTC activity day. Payment records reflect reconciled application data, not a bank settlement or accounting report.

## Server rollout

Push the reviewed commit from the development computer first. On Ubuntu, execute each step only if the preceding one succeeds:

1. Pull the update in `/opt/photoresizekaro`. Preserve a private backup of `.env`, `.env.api`, the database and the current image tags. Do not change `PAYMENTS_ENCRYPTION_KEY` or the database URL. Keep backups outside publicly served directories, chmod 600, and in secure external backup storage.
2. Edit `.env.api` directly on the server:

   ```dotenv
   DONATIONS_ENABLED=true
   USAGE_METRICS_ENABLED=true
   ADMIN_USERNAME=your_chosen_owner_name
   ADMIN_PASSWORD='your_unique_password_of_at_least_16_characters'
   ```

   Username: 3–64 letters, numbers, dots, underscores or hyphens. Password: 16–256 characters, no newline. Use a unique password from a password manager. Single-quote values to avoid Compose interpolation of `$`; a generated hexadecimal password avoids dotenv quoting ambiguity. Never use the example password or `NEXT_PUBLIC_` variables. Remove the old `SUPPORT_PAYMENTS_APPROVED` line. Keep the existing mode, matching provider keys and webhook secret. No secret belongs in Git or chat.

3. Set **new, matching** `IMAGE_TAG` and `API_IMAGE_TAG` in `.env` (for example `admin-v1`); keep `APP_PORT=8088` and `POSTGRES_NETWORK=taskmanager_backend`. Then:

   ```bash
   chmod 600 .env .env.api
   docker compose -f compose.yaml -f compose.payments.yaml config --quiet
   COMPOSE_PARALLEL_LIMIT=1 docker compose -f compose.yaml -f compose.payments.yaml build --pull
   docker compose -f compose.yaml -f compose.payments.yaml run --rm --no-deps api node api/migrate.mjs
   docker compose -f compose.yaml -f compose.payments.yaml up -d --no-build --wait --wait-timeout 90
   docker compose -f compose.yaml -f compose.payments.yaml ps
   curl -fsS https://photoresizekaro.in/api/healthz
   curl -fsS https://photoresizekaro.in/api/commerce/catalog
   ```

   Migration is required **before startup**: it adds admin and usage tables without dropping payment tables. The existing domain's 64 KB Nginx request limit and HTTPS configuration already support these routes; no new host port or separate Nginx vhost is needed. Keep previous images for rollback. The current API requires the added tables. Do not delete tables as a rollback step.

4. Open the pricing and donation pages on a phone. Confirm clicking a plan automatically opens Razorpay, the amount matches, the confirmation returns correctly, and the purchased ZIP/PDF works. Use the appropriate merchant-approved verification flow for live payments. Check the existing webhook events and refunds as in [payment deployment](payments-deployment.md). Automated fixtures do not verify real funds or settlement.
5. Visit `https://photoresizekaro.in/admin-photoresize-mgrrntech`. Sign in with your private environment credentials. Check the selected Live/Test mode, payment amounts, order email, status and usage counters. Sign out and confirm that private data disappears. Do not share screenshots containing customer emails or credentials.
6. Test the usage opt-out in the footer/Privacy page and confirm ordinary image processing remains usable. Older visits and crops cannot be reconstructed from this update.

## Usage metrics and limits

Anonymous first-party counters record public page views, successful image processing, successful cropped outputs, free download clicks, successful ZIP/PDF generation, known preset IDs and broad output size/dimension buckets. They never receive images, file names, EXIF/GPS, exact byte sizes, exact dimensions, email, URLs or user agents. The counter endpoint rejects unknown fields and values. It is rate limited; browser-supplied counts can still be blocked or forged and are estimates, not audited facts.

A random, per-tab, per-UTC-day identifier in sessionStorage estimates visits. It is not a login, cross-device identity or a count of people. The server stores only a daily purpose-bound hash, without payment-session linkage or IP address. Event/visit identifiers are cleaned hourly after roughly two days while the service is running. Aggregate daily counters remain. Recent activity means activity in the previous five minutes, not all idle open tabs. Preset and size counts are based on successful processed outputs; repeated intentional processing counts again. Download counters measure clicks or generated files, not proof that a user saved/opened the file.

The footer and Privacy page offer an opt-out, stored in localStorage. Do Not Track and Global Privacy Control are respected. `USAGE_METRICS_ENABLED=false` disables collection server-wide. Counter failures never block editing, checkout or downloads. Counter requests omit credentials and cannot authenticate to payment/admin APIs. Hosting/proxy diagnostic data is separate and may still exist. The Privacy, Trust and editor notices disclose this behavior in English/Hindi.

## Admin session protection

Admin endpoints require same-origin JSON for login/logout, rate-limit password attempts and bound expensive password verification to two concurrent operations. The production cookie is `__Host-prk_admin_session`, HttpOnly, Secure, SameSite=Strict, host-only and Path=/; its token is hashed in PostgreSQL and never placed in web storage. Sessions expire after 30 minutes without authenticated API activity and absolutely after 8 hours, with at most five sessions per account. Logout requires a session-bound CSRF header and deletes the server session. Private responses use no-store/noindex headers. The panel does not offer unauthenticated refunds, account editing or destructive database actions.

This is single-owner access, without MFA or an external identity provider. Keep the environment, backups and host secure, use a strong unique password, and monitor the service. Configure external access controls on the existing host if your operating policy requires them.

## Validation references

- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): the selected scrypt work/memory configuration.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): session cookies, server expiry and invalidation.

The repository tests use isolated databases and simulated gateway responses. No actual live credentials, paid customer data or production database is used in development tests.
