# PhotoResizeKaro

A free browser photo and signature editor built with Next.js, React, TypeScript and Tailwind CSS. The phased product plan is in `photoresizekaro-phased-plan.md`.

Production target: **https://photoresizekaro.in**, repository **https://github.com/Rahul2749/PhotoResizer**, support **support@photoresizekaro.in**. Follow [the Ubuntu deployment guide](docs/deployment-ubuntu.md) for the existing host Nginx + Certbot server. PhotoResizeKaro has its own Compose project and loopback port **8088**, separate from Task Manager on port 8080. See [release verification](docs/production-validation.md) for checks and remaining server-side steps. Publishing the source does not deploy it to the VPS; server deployment is a separate step.

The homepage now starts with the photo/signature workflow. Optional exam presets expand on demand; colour choices and bilingual help follow the editor. Search metadata, static help content, app structured data and a social preview are included. Follow [the search launch checklist](docs/seo-launch.md) for Search Console ownership, sitemap submission and monitoring. Search rankings are not guaranteed.

## Run locally

Use Node.js 22.18 or newer; the Docker builder and CI use Node.js 24.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Next.js (normally http://127.0.0.1:3000). On Windows, use `npm.cmd` if PowerShell execution policy blocks `npm.ps1`.

```sh
npm test
npm run typecheck
npm run build
```

For browser checks, build first, then run `npm run test:browser` with Google Chrome installed. The tests start a loopback preview if needed. Set `PORT` to use another port. Tests use synthetic images and cover real download bytes, rotated dimensions, offline re-export, oversized PNG handling, invalid inputs, mobile layout, Hindi, network requests, independent photo/signature settings, two-file review, keyboard navigation, and session cleanup.

The production build exports `out/` and generates matching security headers in `.generated/`. Run `npm start` for a loopback-only local preview. Deploy using the included multi-stage Dockerfile and `compose.yaml`; the runtime is an unprivileged Nginx process serving static files, without Node.js or a database. The build hashes actual inline hydration scripts rather than allowing arbitrary inline JavaScript. Its generated `_headers` supports compatible static hosts; other hosts must apply equivalent HTTP headers. Keep the files and their security policy from the same build together.

`npm run check:production` validates the export. `node scripts/smoke-test.mjs http://127.0.0.1:8088` checks the running production container. Set `PLAYWRIGHT_BASE_URL` to test an existing server instead of starting the local preview. CI installs Chromium; local browser tests use installed Chrome. `npm run package:source` creates an allowlisted source archive under `release/`, without credentials or generated artifacts.

## Test on a phone

Connect your computer and phone to the same Wi-Fi, then run:

```sh
npm run build
npm run preview:lan
```

Open the printed `Phone preview` URL in Chrome on Android or Safari on iPhone. Use the computer's Wi-Fi/Ethernet address rather than a VPN or virtual adapter address. The default phone-testing port is 3002, separate from the loopback preview. Keep the computer running. If Windows Firewall prompts, allow Node.js on Private networks. Guest Wi-Fi client isolation or a VPN may prevent devices from reaching each other.

Start with JPG photos/signatures; HEIC is not supported yet. Prepare both files, switch between steps, adjust each file's limit, check the combined review, and download both images. Confirm they open correctly in your phone's Files/Downloads. After the editor has loaded, disable phone networking and repeat an edit/export to check local processing. Clearing the session releases browser job state; original/downloaded files remain on the phone.

Phone images are processed on the phone. This static preview server serves application assets and does not accept photo uploads. Stop the preview with Ctrl+C when finished. Restart after rebuilding source changes; if the computer's LAN address changes, use the newly printed URL.

## Implemented features

- Guided Photo → Signature → Review & download workflow. Each editor retains its own file, crop, dimensions, format, size limit, and validated result while switching steps.
- Shared review with separate, clearly named image downloads; each file can also be downloaded independently without completing the other step.
- Editable starting limits of 50 KB for photos and 20 KB for signatures, explicitly labelled as examples rather than official application requirements.
- Per-file clearing and a confirmed clear-session action that releases both images and revokes generated preview URLs. No image state survives a page reload.
- Blue, violet, coral, and charcoal color previews, with English/Hindi labels.
- Eight source-scoped application presets: JEE Main 2026, NEET UG 2026, CUET UG 2026, CTET September 2026, Joint CSIR-UGC NET June 2026, IBPS 2026–27 calendar guidance, SBI general careers FAQs, and SSC CGL 2026 signature guidance. See `docs/preset-research.md` for official references, selection rationale and limitations.
- Applying a preset preserves selected files, invalidates old generated results, and updates both editors. Preferred, derived and unspecified dimensions are clearly distinguished. The picker disables application after each record's review date until its sources are rechecked.
- Live capture guidance and a signature-only upload review for SSC. The inconsistent SSC physical dimensions are disclosed and not guessed. Other forms' additional live capture remains an explicit separate step on their official portals.
- English/Hindi interface, local JPEG/PNG/WebP selection and drag/drop, bounded file-header/dimension checks before decoding.
- Crop by output aspect ratio, zoom/pan controls, 90-degree rotation, original aspect ratio lock.
- Pixel, centimetre, and percentage resizing. JPG supports 96/200/300 DPI with JFIF resolution metadata; PNG/WebP use native browser export behavior.
- Maximum file size presets (20/50/100 KB) and a custom limit; decimal KB = 1,000 bytes.
- Optional minimum size for each file, with inclusive byte-range validation. Files below the minimum are reported honestly; no padding bytes are inserted. Dimensions and format remain explicit choices.
- Expandable original-file checks and per-rule exported-file checks for size, dimensions, and format. Original checks use the unrotated source against the currently selected output settings.
- A bilingual `/trust` page explaining local processing, hosting request data, metadata cleanup, session clearing, current limits, and a reproducible offline/network check. Editor links open separately to preserve the current job.
- Privacy, terms and contact pages, support email, canonical domain metadata, robots.txt, sitemap and a custom 404 page.
- JPEG and WebP quality search; PNG lossless export with honest failure if it exceeds the chosen limit.
- Worker/OffscreenCanvas processing where supported and a main-thread Canvas compatibility path.
- Actual output format/dimension/byte validation, preview and download; stale results invalidated after edits.
- Local job cleanup, no watermark, no account, no payment gate, no external fonts/analytics/ad scripts.

## Limits and privacy boundary

Images are decoded and re-encoded locally. No uploads or image persistence are implemented. Original EXIF/GPS metadata is not copied. Downloaded files remain on the user's device. Clearing a job releases application references; it is not secure device-memory erasure.

The host still serves app assets and may log those requests. The supplied Nginx configurations disable access logs, while error/provider logs can still contain technical request data. A production CSP uses exact script hashes, rejects script attributes and disallows script `unsafe-inline`/`unsafe-eval`. CSS permits inline styles for the editor. HTTP headers block framing and disable unused camera/microphone/geolocation/payment permissions. These measures do not constitute an independent security audit.

Supported inputs are still JPEG, PNG and WebP up to 25 MB, 24 megapixels, and 12,000 pixels per side. Output is capped at 4,096 pixels per side. A bounded header inspection rejects excessive declared dimensions before bitmap allocation. The retained editor preview is capped at 1,600 pixels; processing crops/transforms directly into the output canvas instead of allocating a second full-resolution canvas. Full-resolution decoding still uses browser memory; real low-memory phone testing remains necessary. No HEIC/PDF/GIF or animation editing is promised. Corrupt inputs fail visibly.

Dimensions never shrink silently to satisfy a KB target. An oversized result cannot be downloaded through the success action: increase the limit, reduce dimensions, or choose another format. Check portraits/signatures visually for readability. Presets are source-scoped file-rule aids and do not guarantee portal acceptance or official endorsement. A correct size/format does not verify face framing, appearance, signature ownership or every requirement in a notice.

Centimetres convert at the selected DPI. JPEG export sets both JFIF density axes before evaluating byte limits; this does not add pixel detail. CTET's physical measurements are converted at an app-selected 300 DPI and rounded to whole pixels; the derived pixel values are not mislabelled as official pixel requirements. PNG/WebP use the browser's export behavior and a 96 DPI conversion in this interface. Transparency is flattened onto white for JPEG. Device/browser encoders may produce different byte sizes, so each final output is checked.

The page must load before network disconnection. Worker assets are requested on export; if a worker cannot start offline, processing falls back to the already-loaded local Canvas path. This is not an installable offline PWA. There is no production launch, independent security audit, payment integration, or donation collection yet.

## Verification

On 4 November 2026, the production static build, TypeScript check, **22 unit/preset tests** and **17 Chrome browser tests** passed. Browser tests ran against the actual restricted Docker runtime and cover real downloads, independent workflows, mobile/Hindi layout, offline export, preset/DPI bytes, pre-decode memory limits, worker/compatibility rotation, legitimate hydration and rejection of an unapproved inline script. Docker smoke checks cover routes, headers, caching, rejected POSTs, health and real 404 responses. The production dependency audit reported no known advisories at that time.

These checks use Chrome desktop/mobile viewports. A user reported a successful phone smoke test; a recorded device/browser matrix remains before public beta. Public DNS, TLS, renewal, mailbox operation and the actual VPS remain deployment-time checks. Preset sources were reviewed on 25 October 2026 and are due for maintenance on 24 November 2026; hardening did not re-verify their official requirements.
