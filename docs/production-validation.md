# Production preparation — 4 November 2026

Target: photoresizekaro.in, Ubuntu host Nginx/Certbot, dedicated Docker Compose project and loopback port 8088. These results describe local verification, not a completed remote deployment.

## Checkout, admin and usage update — 5 November 2026

The updated checkout automatically navigates to the verified Razorpay host in the same tab, with a prominent high-contrast fallback and active-pass shortcut. The private owner route is /admin-photoresize-mgrrntech. Donations use DONATIONS_ENABLED; usage counters have a public opt-out and server disable flag.

Validation passed: **28 unit/security tests**, **23 real-PostgreSQL integration tests**, and **33 Chrome browser tests**. Database checks also passed under a restricted non-superuser role. Both final Docker images built with the existing read-only, unprivileged, limited-memory settings. Frontend and payment API smoke checks passed with fixture-only checkout-disabled configuration. A separate browser check against the actual isolated API verified seeded login, protected records, stored usage without credentials on counter requests, and logout revocation. Admin session expiry, credential changes/removal, CSRF, origin checks, brute-force limiting, anonymous-event deduplication and rejected metadata were verified. Actual ZIP/PDF bytes, worker/offline editing and mobile layouts remain covered.

The screenshots in admin-dashboard-desktop.png, admin-dashboard-phone.png and checkout-improved-phone.png use simulated data, not paid customer records. No real gateway keys were used or charges created. No production database or VPS was changed by these tests. Deployment requires the additive migration and private admin credentials; see [the admin upgrade guide](admin-deployment.md). No independent security audit is claimed.

## Payment release checks — 5 November 2026

The optional payment release adds Node.js/PostgreSQL, ₹5 ZIP and ₹10 Print + ZIP day passes, required email, separate support payments from ₹5, and MGRRNTECH's supplied public payment contact. Both frontend/API images built; 26 unit/security tests, 15 real-PostgreSQL integration tests with a simulated provider, and 24 browser tests passed. Frontend and payment-API smoke checks passed in restricted, isolated local containers. Tests verified actual ZIP image bytes and A4 PDF dimensions. No live keys were supplied, no Razorpay charge was created, and no VPS database or runtime was changed by these preparation checks. See [the payments guide](payments-deployment.md) for test/live configuration and remaining merchant validation. The original free-launch evidence below is historical.

## Completed checks

- TypeScript: `npm run typecheck` passed.
- Unit/preset/header parser: all 22 tests passed, including byte limits, JPEG DPI, source dates, malformed files and pre-decode input limits.
- Static export: Next.js 16.4.5 build passed with domain canonicals, sitemap, robots, support pages, custom errors and no exported source maps.
- Security policy: seven HTML files and seven unique script hashes validated; no script `unsafe-inline`/`unsafe-eval`. Browser hydration works and an unapproved inline script was blocked.
- Browser: all 17 Playwright tests passed against the built Docker image using installed Chrome, including phone viewports, Hindi, real downloaded bytes, local/offline processing, preset workflows, worker and main-thread rotation.
- Production dependency audit: zero known advisories reported by npm on the verification date. This is time-specific, not an assurance against undiscovered vulnerabilities.
- Docker: Linux multi-stage image built successfully; health was healthy while running as `nginx` with read-only root filesystem, temporary writable memory, dropped capabilities, no-new-privileges, 128 MB memory and 64-process limits.
- `docker compose config --quiet` and the container's `nginx -t` passed.
- Both host HTTP/HTTPS Nginx templates passed `nginx -t` in disposable local Nginx containers. HTTPS used a temporary self-signed test certificate, not a real certificate for the domain.
- Actual HTTP smoke checks passed at loopback port 18088: health, five pages, robots/sitemap/icon, security headers, immutable hashed assets, revalidated HTML, rejected POST, HEAD and missing-route/file 404 responses.
- After the final dependency/packaging changes, the image was rebuilt successfully; HTTP smoke checks and all three targeted production browser tests passed again against the new image. Mobile privacy/terms/contact pages fit a 390-pixel viewport; the contact page and desktop editor screenshots were visually inspected.
- The source archive was generated with an explicit file list and checked for the required Docker/Nginx configuration and excluded private/generated paths.

The build and smoke checks are reproducible through the included CI workflow. Check the repository's Actions tab for the status of each pushed revision; the local results above do not certify a GitHub run.

## Deployment-time checks

Follow [the server guide](deployment-ubuntu.md). Public DNS, actual VPS resources, Nginx's combined existing configuration, real certificate issuance, renewal, HTTPS headers, server firewall and support-mailbox delivery require verification on the server. No server credentials were supplied, and no remote configuration was changed during preparation.

The original 4 November static release had no backend or usage counters. Current payment/admin/usage behavior is described above and in the linked upgrade guides. There is still no photo upload endpoint. Error/provider logs may contain technical request details. Images still consume memory on the user's device; low-memory Android and iOS/Safari testing should continue. No independent security audit or absolute data-safety guarantee is claimed.

Preset requirements were originally reviewed on 25 October 2026, with maintenance due on 24 November. This production work did not refresh official application rules. Monitor dependencies/base images and certificate renewal, preserve rollback images, and review presets before launch.
