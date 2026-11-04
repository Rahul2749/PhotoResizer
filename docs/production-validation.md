# Production preparation — 4 November 2026

Target: photoresizekaro.in, Ubuntu host Nginx/Certbot, dedicated Docker Compose project and loopback port 8088. These results describe local verification, not a completed remote deployment.

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

The tool has no photo upload endpoint, database, analytics scripts, payment integration or donation collection. Runtime Nginx only serves static files. Error/provider logs may contain technical request details. Images still consume memory on the user's device; low-memory Android and iOS/Safari testing should continue. No independent security audit or absolute data-safety guarantee is claimed.

Preset requirements were originally reviewed on 25 October 2026, with maintenance due on 24 November. This production work did not refresh official application rules. Monitor dependencies/base images and certificate renewal, preserve rollback images, and review presets before launch.
