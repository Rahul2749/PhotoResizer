# Payments, PostgreSQL and paid tools

Prepared 5 November 2026 for photoresizekaro.in. Seller supplied by the owner: **MGRRNTECH**, **contact@photoresizekaro.in**, **+91 82759 28446**. Editor support remains available at support@photoresizekaro.in.

The existing free site is static. This release adds a separate Node.js payment API, PostgreSQL records and Razorpay-hosted Payment Links. Images continue to be processed in browser memory. Do not collect live payments until your merchant account, credentials, webhook delivery, payment return and real delivery/refund checks have been validated.

## Products and customer flow

| Product | Gross app price | Delivery |
|---|---:|---|
| ZIP Day Pass | ₹5 | Photo + signature ZIP downloads for 24 hours |
| Print + ZIP Day Pass | ₹10 | ZIP plus printable A4 photo-sheet PDFs for 24 hours |
| Donate / voluntary support | ₹5–₹1,000, whole rupees | Separate support record; no paid entitlement |

Core editing and individual downloads stay free. A pass starts at the server's first verified captured-payment confirmation. Repeat callbacks do not extend it. There is no automatic renewal. ZIP requires two validated files; PDFs use a validated photo, editable 10–150 mm tiles and 1–12 copies that fit on one A4 page. Images fit within tiles without stretching. These conveniences do not guarantee portal acceptance.

Checkout requires an email. The API encrypts it in PostgreSQL and passes it to Razorpay for payment-link communication. There is no verified email login. A 30-day essential HttpOnly payment-session cookie identifies purchases in that browser; free editing does not create it. A private restore code can grant access to its purchase from another browser. Keep the code private. The code is encrypted in the database and has a separate lookup hash. JSON payment acknowledgements are available; they are not GST tax invoices. Razorpay handles its own payment messages; no SMTP password or mail-delivery service is bundled.

## Architecture

```
Browser -- HTTPS --> existing Ubuntu Nginx --> web container :8080
                                               | static editor / pricing / donate
                                               | /api/* only
                                               v
                                          payment API :3000
                                               |        |
                                   own PostgreSQL DB   Razorpay HTTPS API
                                               ^
                                      signed webhook events
```

Razorpay checkout opens on the provider's site in a separate tab. There is no payment SDK, iframe, analytics or third-party checkout script in the editor. No image bytes, filenames, thumbnails, photo metadata, card numbers or UPI PINs are accepted by the API. Its JSON routes accept only the fields needed for payment operations, and its body limit is 64 KB for webhooks / 4 KB for checkout.

The API runs unprivileged with a read-only filesystem, dropped capabilities and a 192 MB memory limit. It has no public published port. Only the API joins the existing database network. The frontend's `/api/` proxy resolves the API container dynamically, so the free site can still run without the API; checkout then stays unavailable. Use the opt-in `compose.payments.yaml` overlay to enable the backend.

## 1. Inspect the existing database network

On the VPS:

```bash
docker inspect taskmanager-db-1 --format '{{json .NetworkSettings.Networks}}'
docker compose version
cd /opt/photoresizekaro
git status
```

Record the actual network name. Do not guess it and do not expose PostgreSQL publicly. The existing published `127.0.0.1:5433` is a host-loopback port; the API container should use the database container's hostname on its Docker network and port **5432**. Leave Task Manager's database, roles, volumes and Compose project intact.

## 2. Create a separate database and role

Use the existing database administrator inside the PostgreSQL container. The command below references its existing username without printing a password:

```bash
docker exec -it taskmanager-db-1 sh -lc 'psql -U "$POSTGRES_USER" -d postgres'
```

If this container uses a different administrator setup, use its existing secure connection method. In psql, create these only if they do not already exist:

```sql
CREATE ROLE photoresizekaro LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10;
\password photoresizekaro
CREATE DATABASE photoresizekaro OWNER photoresizekaro;
REVOKE ALL ON DATABASE photoresizekaro FROM PUBLIC;
GRANT CONNECT ON DATABASE photoresizekaro TO photoresizekaro;
\q
```

Enter the new role's strong password at the hidden psql prompt. Keep it in your password manager/server configuration; do not paste it in chat or commit it. Do not grant this role membership in Task Manager's roles. The API checks that the connection URL names the configured PhotoResizeKaro database. Its migration creates only `prk_*` tables in that separate database.

## 3. Configure the server-only environment

Pull the reviewed release. Back up the current app environment before changing image tags:

```bash
cd /opt/photoresizekaro
git pull --ff-only
cp .env .env.before-payments
cp .env.api.example .env.api
chmod 600 .env.api
nano .env.api
```

Set `DATABASE_URL` to the new role/database with the verified container hostname. Percent-encode special password characters in the URL. Do not use the PostgreSQL superuser. For an external database use its provider's validated TLS connection settings; do not bypass certificate verification.

Generate the application encryption key locally on the server:

```bash
openssl rand -hex 32
```

Put that value in `PAYMENTS_ENCRYPTION_KEY`. Back it up securely with the database. Losing it prevents decryption of checkout emails and restore codes. Do not rotate it without a data re-encryption plan. The example/test keys in the repository are not production secrets.

Start with `PAYMENTS_MODE=disabled`. Then put these non-secret deployment settings in `.env` using the **actual** inspected network:

```dotenv
POSTGRES_NETWORK=YOUR_VERIFIED_DATABASE_NETWORK
IMAGE_TAG=payments-v1
API_IMAGE_TAG=payments-v1
```

Keep `APP_PORT=8088`. `.env.api` is excluded by Git and the source package. Actual secret values stay on the server. Do not run `docker compose config` without `--quiet` when sharing output, because expanded configuration can disclose environment secrets.

## 4. Build, migrate and start with checkout disabled

Run commands in order and stop if any fails:

```bash
docker compose -f compose.yaml -f compose.payments.yaml config --quiet
docker compose -f compose.yaml -f compose.payments.yaml build --pull
docker compose -f compose.yaml -f compose.payments.yaml run --rm --no-deps api node api/migrate.mjs
docker compose -f compose.yaml -f compose.payments.yaml up -d --no-build --wait --wait-timeout 90
docker compose -f compose.yaml -f compose.payments.yaml ps
curl -fsS http://127.0.0.1:8088/api/healthz
curl -fsS http://127.0.0.1:8088/api/commerce/catalog
```

Expect API health `{"ok":true}` and catalog mode `disabled`. Build on another machine and transfer matching images if VPS memory is insufficient. Keep both previous frontend/API images for rollback.

## 5. Update only this domain's host Nginx configuration

The previous static host vhost allowed 1 KB request bodies. Webhooks need the new **64 KB** limit; otherwise the host may return 413 before the API sees the signed event. The site still has no image upload endpoint.

Review the provided `deploy/nginx-https.conf`, preserving your actual certificate paths and any intentional local settings. Back up this application's current site file, install its reviewed updated file, then test/reload:

```bash
sudo cp /etc/nginx/sites-available/photoresizekaro /etc/nginx/sites-available/photoresizekaro.before-payments
sudo cp deploy/nginx-https.conf /etc/nginx/sites-available/photoresizekaro
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://photoresizekaro.in/api/healthz
```

No extra host `/api/` block is required: the existing proxy sends the request to the frontend container, which routes it internally. Do not replace Task Manager's vhost. Verify public `/pricing`, `/donate`, `/refunds` and the seller contact details. `/purchases` and `/payment-status` are noindex and omitted from the sitemap.

## 6. Connect Razorpay test mode

In your Razorpay merchant account, finish the required business/account setup. Confirm that MGRRNTECH's legal/account details, settlement bank, customer contact information and any required business address/tax information are accurate. This app does not invent those details or implement statutory tax-invoice issuance. Check the current merchant-specific fees; ₹5/₹10 are gross receipts, not profit. Confirm that Razorpay permits your proposed commercial voluntary-support model before enabling donation collection. The app does not claim charity status or tax deductibility.

Generate **test** API keys and put them directly into `.env.api`:

```dotenv
PAYMENTS_MODE=test
PAYMENTS_LIVE_ENABLED=false
RAZORPAY_KEY_ID=YOUR_RZP_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_STRONG_SEPARATE_WEBHOOK_SECRET
RAZORPAY_ACCOUNT_ID=YOUR_ACCOUNT_ID_IF_AVAILABLE
```

Use a separate random webhook secret of at least 24 characters. Configure this test-mode webhook URL:

```text
https://photoresizekaro.in/api/commerce/webhook
```

Enable **payment_link.paid**, **refund.processed** and **payment.dispute.created** events. The API also periodically reconciles pending/active orders against Razorpay. Set `SUPPORT_PAYMENTS_APPROVED=true` for the approved/tested support model; otherwise donation checkout remains disabled.

After saving server configuration, recreate just the API:

```bash
docker compose -f compose.yaml -f compose.payments.yaml up -d --no-build --force-recreate --wait --wait-timeout 90 api
```

Keys remain server-only. Frontend files do not need a rebuild to change credentials or mode. Test and live orders are isolated; a test pass does not become a live pass.

## 7. Test the complete merchant flow before live collection

- Open `/pricing`, confirm the **TEST MODE** banner and required email. Make a test ₹5 purchase using Razorpay's documented test flow. Save the restore code, return from checkout, refresh status and verify the ZIP pass.
- Prepare a photo and signature in the editor. Individual downloads stay free. In Review & download, check paid access and download the ZIP. Open both extracted images.
- Test ₹10: download/open the A4 PDF; check its physical page/tile dimensions and print at Actual size. Verify pass expiry and limits. A pass is not consumed per export.
- Test the ₹5 support payment separately: it must create a donation record with **no** ZIP/print access.
- Confirm emails/payment-link communication in your account's configured flow. The app provides a downloadable acknowledgement, not a guaranteed custom email delivery service or GST invoice.
- Test cancelled and failed checkout, delayed confirmation, duplicate callbacks and webhook retries. A browser success message alone must not unlock access.
- Refund a test purchase in the Razorpay Dashboard. Confirm the corresponding pass is revoked. Partial refunds also revoke that pass. Check that repeated/refunded events do not reactivate or extend it.
- Restore a completed purchase in another private browser using its code. Confirm a random code or email alone cannot retrieve it. Keep payment details and codes private.
- Check webhook delivery in Razorpay and sanitized API logs. Never copy raw gateway payloads containing personal data into public reports.

If a timed-out link creation reached Razorpay, its reference can be reconciled; do not repeatedly pay to solve a pending status. Keep notifications/webhooks enabled and use Your purchases / payment support.

## 8. Enable live collection deliberately

After account approval and test validation, configure matching **live** API keys and a separately configured **live** webhook in `.env.api`. Set `PAYMENTS_MODE=live` and `PAYMENTS_LIVE_ENABLED=true`. Recreate the API and verify the catalog reports `live` without a test banner. Confirm donation approval separately. Do not publish test orders as real revenue.

Make a small real purchase under your merchant agreement, confirm capture, customer delivery, the real acknowledgement, settlement records and a real refund path before announcing paid availability. An automated local fixture or test-mode transaction is not proof of live settlement.

## Records, backup and operations

Tables: `prk_sessions`, `prk_orders`, `prk_order_access`, `prk_payment_events`, `prk_refunds`. Orders contain encrypted email/restore codes, hashed recovery lookup, product/amount/mode, provider references, captured/refunded state, expiry and available gateway fee/tax amounts. Event rows store selected identifiers/type/outcome, not the complete payload. Refund IDs deduplicate repeated delivery without double-counting. No photo storage table or file-upload route exists.

Back up the dedicated database regularly using `pg_dump` through your existing secure administration process, and test a restore into a separate database. Keep the encryption key and configuration in a secure backup, with access restricted to operators. Avoid public backups, secret values in command history, or sharing expanded Compose configuration. Define the transaction-record retention process with your accounting/support requirements; the app does not silently delete financial records after pass expiry.

Run one API instance initially. Rate limits are local to that instance; database locks/idempotency still protect payment state. Reconciliation handles a bounded batch every two minutes, including interrupted creates, pending orders and recent support payments. Monitor API health and Razorpay webhook-delivery failures. Docker restart policies do not automatically fix a merely unhealthy container.

For routine checks:

```bash
docker compose -f compose.yaml -f compose.payments.yaml ps
docker compose -f compose.yaml -f compose.payments.yaml logs --tail=100 api
```

From a testing machine with Node:

```bash
node scripts/smoke-test.mjs https://photoresizekaro.in
node scripts/smoke-payments.mjs https://photoresizekaro.in
```

These smoke checks create no payment link or charge. The second uses a deliberately rejected cross-origin POST plus read-only requests. For rollback, disable new checkouts, restore reviewed image tags/configuration and use the matching Compose files; preserve the new database and financial records. Do not drop it or run volume deletion as a rollback step. A full return to the previous static release can use the base Compose file and prior frontend image, while records remain backed up. For future updates, continue using both Compose files whenever the API is enabled.

## References

- [Razorpay standard Payment Links](https://razorpay.com/docs/api/payments/payment-links/create-standard/): paise amounts, hosted links, customer email and callback configuration; ₹5 exceeds the documented ₹1 INR minimum.
- [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/): raw-body HMAC, duplicate events and ordering.
- [Razorpay payment-link events](https://razorpay.com/docs/webhooks/payment-links/) and [refund events](https://razorpay.com/docs/webhooks/refunds/).
- [Razorpay fees](https://razorpay.com/pricing/): confirm your own account's applicable terms and taxes.
- [PostgreSQL transactions in node-postgres](https://node-postgres.com/features/transactions): a checked-out client is used for each transaction.
