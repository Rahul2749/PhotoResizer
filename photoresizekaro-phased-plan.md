# PhotoResizeKaro — phased product and launch plan

Prepared: 25 October 2026. Planning estimates assume one developer and should be adjusted after the core prototype. Progress depends on exit criteria, not dates alone.

## 1. Product direction

Help people prepare readable photos and signatures for Indian applications quickly, privately, and affordably.

The product promise: **“Prepare your photo. Check its size. Keep it on your device.”**

Differentiate through verifiable local processing, accurate presets, clear output checks, fast mobile workflows, and fair pricing. Privacy and correct output are included in the free version. Paid plans sell convenience and time savings.

Do not advertise “100% safe,” “unhackable,” “government approved,” or “guaranteed acceptance.” Browser processing reduces exposure but cannot protect a compromised device, extension, or altered application. Describe exactly what the product does and publish evidence.

## 2. Free, paid, and supporter model

These are proposed launch prices, not validated demand or profitability forecasts. Display the final payable total before checkout; target these as customer-facing totals subject to confirming applicable billing treatment.

| Offer | Proposed price | Duration | Included |
|---|---:|---|---|
| Free | ₹0 | Ongoing | Individual photo/signature processing, crop/rotate, pixel/cm resize, target-size compression, supported format conversion, verified presets, output checks, metadata removal, English/Hindi, no watermark, no login |
| Day Pass | ₹10 | 24 hours from confirmed payment | Free features plus bulk ZIP processing up to 20 files per batch, preset print sheets, local custom presets, and export a photo/signature pair together |
| Monthly Plus | ₹49 | 30 days from activation | Day Pass features, up to 50 files per batch, reusable local workflow settings and filenames, access across signed-in devices |
| Cafe | ₹99 | 30 days from activation | Plus features, up to 100 files per batch on supported devices, multiple local job queues, reusable customer-neutral job templates, print-sheet layout controls, and a clear-between-customers workflow |
| Support the Free Tool | ₹10 / ₹20 / ₹50 / ₹100 | One-time voluntary contribution | Helps fund the free service; no paid entitlement or better privacy |

Batch sizes are product targets, subject to measured device limits. Process files sequentially or with bounded concurrency; offer smaller batches when memory is insufficient. Avoid “unlimited” claims.

Launch Day Pass and Monthly Plus first. Add Cafe only after pilot users demonstrate repeat demand. All paid periods are prepaid with manual renewal initially; show expiry clearly and do not enable automatic renewal by default. Do not offer annual or lifetime plans until retention and costs are known.

Free users can process individual files repeatedly. Do not intentionally reduce free output quality or remove essential validation to force an upgrade. All editor versions are ad-free; if advertising is introduced later, limit it to separately isolated informational pages.

The photo/signature workflow remains usable for free, with individual downloads. Paid users gain paired export, bulk actions, and reusable workflows.

### Support contributions

- Use “Support the free tool” in the interface. Do not present this commercial product as a charity or claim tax deductibility.
- Show the support option on the support page and unobtrusively after a successful download. Never block the result or preselect a contribution.
- Keep support purchases and paid passes as separate checkout products with separate receipts and records.
- No public donor names, email addresses, or amounts by default. No guilt prompts or repeated popups.
- Explain how contributions help: hosting, verified preset maintenance, accessibility, and keeping core processing free. Publish aggregate updates only when backed by records.
- Confirm the payment provider permits this collection model and document accounting, refund, and receipt requirements before enabling it. This is a launch prerequisite, not an assumption that nonprofit donation facilities apply.

## 3. Trust must be visible and testable

### User-facing trust features

| Trust feature | What the user sees | Evidence required before publishing the claim |
|---|---|---|
| Local processing | “Your photos and signatures are processed in this browser. We do not upload them.” | Automated network inspection and manual review of the production editor |
| Offline processing | “After the editor finishes loading, you can disconnect and continue.” | Crop, compress, and download succeed without a connection after required assets load |
| No account for free tools | File selection opens directly | No login, tracking identifier, or payment step required to use the free workflow |
| Verified requirements | Official source, exam cycle, last checked date, and active/provisional status | Human review against the cited official notice |
| Clear output report | Dimensions, actual bytes, format, and each rule’s pass/fail status | Inspect the final exported file, not just selected settings |
| Metadata cleanup | Explain that export removes location/camera metadata while retaining necessary output resolution information | Inspect representative exported files for EXIF/GPS and required DPI |
| Clear current job | A visible “Clear photos” button | Remove previews, buffers, temporary object URLs, and any application-held job state |
| Transparent service | About, contact, privacy, support/refund policy, security reporting, and change log | Real operator details and maintained pages; no invented badges or testimonials |

“Clear photos” clears the application’s references and job state. Do not claim secure erasure of device memory, browser caches, original files, or downloads. Tell shared-device users that downloaded files must be removed separately.

### Privacy and security implementation

- Use a dedicated static editor origin, isolated from marketing analytics, advertisements, login, and payment scripts. Do not grant an analytics or advertising script access to the editing context.
- Bundle/self-host processing assets. Restrict scripts, frames, forms, and connections through Content Security Policy. Validate the production policy and all intentional cross-origin communication.
- Free editing sends no image bytes, filenames, thumbnails, canvas data, or extracted metadata to an API. Do not use session replay in the editor.
- Keep images in transient job memory. Do not store images in localStorage, IndexedDB, service-worker caches, cloud backups, or account history. Cache only application assets for offline use.
- Saved presets contain settings only. Start with local presets; explain that they belong to the browser and do not automatically sync across devices.
- Paid account and entitlement traffic stays separate from image processing. Define a narrow, origin-checked entitlement exchange; never include image data in it.
- Publish a data inventory: CDN/security request logs, optional analytics events, login identifiers, payment references, support messages, and retention periods. “No image upload” does not mean “no data is collected.”
- Use hosted payment checkout; the application must not collect UPI PINs or card credentials. Keep secrets server-side and use restricted administrative access.
- Provide account deletion with an explanation of transaction records that must be retained. Set actual retention periods after confirming provider and applicable requirements.
- Publish the processing module and instructions for reproducing the offline/network checks if feasible. Link evidence to a released version; source availability alone is not a security audit.
- Maintain dependency updates, release checks, incident handling, and a contact for vulnerability reports. Publish independent-review claims only after an actual review.

## 4. Delivery phases

### Phase 0 — requirements and trust design (3–5 working days)

**Outcome:** a small, testable product definition.

- Confirm name/domain availability and brand checks before purchase.
- Speak with a suggested initial sample of 5 applicants and 3 cyber-cafe operators. Observe their existing workflow and rejection problems; validate willingness to pay.
- Select 5–10 initial presets from official sources. Record photo versus signature, upload versus live capture, cycle, dimensions, permitted byte range, format, and any additional instructions.
- Define bytes versus KB conversion per preset. Avoid presenting derived pixel dimensions as official requirements when the source specifies only physical dimensions.
- Create a permissioned/synthetic image test set covering portraits, signatures, phone orientation, transparent PNGs, large files, and unreadable inputs.
- Decide supported inputs and limits. Start with JPEG, PNG, and WebP; show a useful error for HEIC, PDFs, animated files, and other unsupported formats rather than silently mishandling them.
- Define the data inventory, trust copy, supported browsers, and output-validation rules.

**Exit criteria:** source-backed preset records, agreed free/paid boundary, documented data flows, and test inputs ready. No unverified “accepted by the portal” claims.

### Phase 1 — reliable free editor (weeks 1–3)

**Outcome:** users can produce usable files without signing in.

- Build static frontend pages and the isolated browser editor. Prefer Next.js static export with TypeScript and Tailwind for this plan; no runtime SSR requirement.
- Implement orientation correction, crop, rotate, resize, target byte range, format selection, and preview/download.
- For centimetres, use an explicit DPI value: pixels = cm / 2.54 × DPI. Handle resolution metadata deliberately; Canvas export alone does not preserve an arbitrary requested DPI.
- Search compression quality within a bounded attempt count. Only change dimensions or format when the selected rules permit it and the user understands the change.
- Treat PNG differently from lossy JPEG/WebP. If constraints cannot be satisfied, show the failed rule and a useful correction; do not quietly break the preset.
- Show original/output file sizes, dimensions, and actual output format. Preserve legibility rather than pursuing the smallest possible file.
- Add English/Hindi instructions, accessible controls, a clear-job action, and a working offline-after-load core workflow.
- Use a Web Worker for suitable processing tasks, lazy-load optional codecs, and release buffers between jobs.

**Exit criteria:** every supported preset test either produces a validated output or explains why it cannot; no silent false pass. Manual reviewers can read test signatures and inspect portraits. Free processing needs no API/account.

### Phase 2 — trust verification and public beta (weeks 4–5)

**Outcome:** privacy claims and mobile usability are demonstrated before promotion.

- Run end-to-end network inspection on file selection, edit, preview, download, clear, and failure paths. Include any diagnostics code.
- Confirm all image processing works offline once relevant assets have loaded. Publish a short reproducible demonstration with version/date.
- Verify exported metadata, rotation, dimensions, actual MIME/file format, transparency handling, and browser download behavior.
- Test named Android Chrome and iPhone Safari devices, including a low-memory Android device; record OS/browser versions and supported input sizes.
- Provisional performance target: processing p95 at or below 5 seconds for representative 12-megapixel JPEG input on the recorded mid-range Android device after assets are loaded. Measure cold-load time separately; adjust the supported input envelope if needed.
- Treat 300 KB compressed initial JavaScript as a budget to measure, with codec/model downloads reported separately. Test keyboard access, Hindi text layout, screen-reader labels, and slow connections.
- Publish the Trust page, operator/contact details, privacy notice, terms, and support/security reporting routes. Keep editor third-party scripts absent.
- Gather beta feedback without requesting sensitive images; use optional text reports and sanitized error categories.

**Exit criteria:** production network and offline checks pass, no unresolved high-severity privacy/security issue, tested device matrix published, and a suggested first 20 real-user sessions show no blocking recurring defect.

### Phase 3 — useful discovery and distinct workflows (weeks 6–8)

**Outcome:** attract users through specific, maintained solutions.

- Publish 10–20 useful landing pages around actual workflows and verified presets. Each page opens the correctly configured editor.
- Add a “Why does my file fail?” checker for byte range, dimensions, and format. State that it checks technical file rules, not full application eligibility or photographic suitability.
- Add a guided photo/signature pair workflow with separate free downloads, before/after comparisons, and readable suggestions for fixing failures.
- Show provisional/stale notices. Assign a reviewer, review due date, and correction route to each preset. Disable an inaccurate preset until corrected.
- Add sitemap, canonical URLs, language alternatives, useful internal links, and concise guides. Do not create duplicate pages for every keyword spelling.
- Measure aggregate tool starts, completed exports, failure categories, and preset usage only through a deliberately reviewed, disclosed, image-free event path. Keep detailed filenames and image content out of diagnostics.
- Prioritize search queries that reveal unmet needs; do not set a mandatory 200-page target or assume indexing/traffic by a specific date.

**Exit criteria:** maintained page/preset coverage, reliable aggregate success measurements, and evidence identifying at least one workflow users would pay to repeat faster.

### Phase 4 — affordable passes and voluntary support (weeks 9–12)

**Outcome:** collect payment fairly for demonstrated convenience.

- Build Day Pass and Monthly Plus features before selling them: bounded bulk processing/ZIP, print sheets, paired export, and local saved presets.
- Add ASP.NET Core API and PostgreSQL for users, orders, payment events, and entitlements only. Start with Google sign-in; defer phone OTP costs and abuse handling.
- Introduce hosted checkout for ₹10 and ₹49 passes. Add the ₹10/₹20/₹50/₹100 support options only after provider approval of the collection model.
- Verify payment signatures and provider status server-side. Handle duplicate, delayed, reordered, failed, and refunded events idempotently. Never unlock from the browser’s success callback alone.
- Define pass activation, expiry, restore-purchase, refund, account deletion, and interrupted-checkout behavior. Show the order reference and human support route.
- Document the privacy boundary for login/payment traffic. Accept that browser-only feature limits can be bypassed; server rate limits protect APIs, not local image transformations.
- Test print sheets at actual size, including browser/printer scaling instructions. Label templates by document purpose; do not imply any layout guarantees official acceptance.
- Measure actual payment success, net receipts, refund rate, support burden, and repeat use. Preserve the full free workflow.

**Exit criteria:** live-mode payment reconciliation works, failed/duplicate payments do not create incorrect access, refund and expiry paths work, and initial paying users can independently retrieve their purchases. Payment sandbox tests alone are insufficient for launch validation.

### Phase 5 — cafe efficiency and cautious expansion (months 4–6)

**Outcome:** grow repeat use without weakening trust or mobile performance.

- Pilot ₹99 Cafe with a small operator group. Add job queues, reusable naming rules, flexible print layouts, and clear-between-customers controls.
- Make clear that access across devices does not sync customer photos. Never store customer names in reusable template defaults.
- Ship an installable offline PWA, caching application assets only. Define paid offline entitlement expiry and the next verification requirement visibly.
- Evaluate background removal separately: license compatibility, model download size, low-end performance, battery/memory, and suitability for the selected document rules. Ship only when these pass; do not bundle it into launch promises.
- Expand regional languages and presets based on measured demand and available review capacity.
- Consider independent security review when revenue supports it; publish scope and date, not a vague “certified secure” badge.
- Evaluate ads only if needed for sustainability, on isolated informational pages. Re-run data-flow/privacy checks before enabling any vendor.

**Exit criteria:** repeat cafe use, sustainable support costs, no stale critical presets, and each new feature meets the same privacy/performance checks as the original editor.

## 5. Architecture and operating limits

| Stage | Infrastructure | Reason |
|---|---|---|
| Free launch | Static frontend + isolated static editor + CDN + versioned preset files | Local processing and minimal operational complexity |
| Paid launch | Above + .NET API + PostgreSQL + hosted checkout + sign-in | Orders, account recovery, entitlements, and reconciliation |
| Proven growth | Add API rate limiting/shared cache and scaling when measured demand requires them | Protect real bottlenecks rather than add services prematurely |

Next.js on Cloudflare Pages is a static-export deployment. Do not mix in SSR-only features without revisiting hosting. No image-processing server, upload endpoint, RabbitMQ, or cloud photo history is planned. A future server-side image API would be a separately scoped product with different privacy commitments.

Choose a small processing stack after a prototype benchmark instead of loading every candidate library. Native Canvas can cover basic paths; add Pica or a selected WASM codec only where quality measurements justify it.

## 6. Economics and measures

Small payments are viable only if support and collection costs stay low. Maintain a simple model:

**Contribution per order = amount collected − applicable taxes on the sale − gateway fees/taxes − expected refund/chargeback cost − variable delivery/support cost.**

Separate fixed operating costs: domain, hosting, database, monitoring, preset maintenance, licensing, and professional services. Founder time is still a cost. Do not treat free-tier infrastructure, UPI checkout, or optional AI libraries as permanently free.

Check merchant-specific provider pricing before launch, including minimum/fixed fees, settlement costs, refunds, and promotional expiry. Do not base the model on an introductory offer. Do not assume contributions or advertising will cover a deficit.

| Metric | Decision it informs |
|---|---|
| Successful validated exports / started jobs | Whether the tool solves the task |
| Failure reason and device class | Which reliability issues need fixing |
| Processing p50/p95 and cold-load time | Whether mobile performance is acceptable |
| Current verified presets / active presets | Whether the trust promise remains accurate |
| Paid conversion among users shown a relevant offer | Whether convenience is worth paying for |
| Renewals and repeat cafe use | Whether monthly offers have a real audience |
| Net receipts, refunds, and support effort | Whether ₹10–₹99 pricing is sustainable |
| Voluntary support participation | Whether contributions help fund free access |
| Privacy regression checks per release | Whether the data boundary remains intact |

Record baseline results before setting conversion or revenue targets. A download is not evidence that an external portal accepted the application. Optional acceptance feedback must be labelled self-reported.

## 7. Decisions intentionally deferred

- Annual/lifetime plans, automatic renewal, phone OTP, and broad regional expansion.
- HEIC/PDF/animated-image support until demand and testing justify it.
- Browser background removal until licensing and device benchmarks pass.
- Public API, image uploads, server processing, and cloud image history.
- Large-scale page generation and ads until quality and economics justify them.

## 8. Sources and implementation notes

External documentation checked during planning; recheck vendor terms and capabilities at implementation time.

- [Cloudflare: static Next.js on Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) — static export deployment.
- [MDN: Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) — output format/quality behavior and 96 DPI metadata.
- [IMG.LY background removal repository](https://github.com/imgly/background-removal-js) — AGPL-3.0 and alternative licensing contact.
- [Google scaled-content policy](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content) — user value takes priority over page count.
- [Google Search documentation updates](https://developers.google.com/search/updates#may-2026) — FAQ rich results discontinued in May 2026; useful FAQ content can remain.
- [Razorpay pricing](https://razorpay.com/pricing/) and [Cashfree pricing](https://www.cashfree.com/payment-gateway-charges/) — review applicable merchant terms and current charges before finalizing unit economics.

This plan replaces the original roadmap for implementation planning. The original downloaded document remains the historical reference.
