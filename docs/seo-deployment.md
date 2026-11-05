# Deploy the focused tools and canonical-host fix

Prepared 5 November 2026. The app already uses the payment Compose overlay, live Razorpay configuration, PostgreSQL and the owner dashboard. This update changes frontend content and container Nginx. **No database migration, new backend settings, key rotation or payment-mode change is required.** Keep the existing API image tag and `.env.api` unchanged.

## 1. Frontend rollout

After pushing the reviewed commit, pull it on the VPS in `/opt/photoresizekaro`. Back up `.env` privately and preserve the previous image tag. Change only `IMAGE_TAG` to a new reviewed release tag, for example `search-v1`; leave `API_IMAGE_TAG`, APP_PORT=8088 and POSTGRES_NETWORK unchanged.

```bash
docker compose -f compose.yaml -f compose.payments.yaml config --quiet
docker compose -f compose.yaml -f compose.payments.yaml build --pull web
docker compose -f compose.yaml -f compose.payments.yaml up -d --no-build --no-deps --wait --wait-timeout 90 web
docker compose -f compose.yaml -f compose.payments.yaml ps
curl -fsS https://photoresizekaro.in/api/healthz
curl -I https://photoresizekaro.in/resize-image-to-50kb
curl -I https://photoresizekaro.in/signature-resizer
curl -I https://photoresizekaro.in/resize-image-to-50kb.html
```

Expect 200 for clean tool URLs and 301 from the `.html` alias to its clean path. Check `/tools`, `/about` and `/guides/photo-upload-rejected`, and that the sitemap contains the seven tool URLs. Refresh the relevant browser tabs to load new assets. New tabs preserve existing image edits when opening related tools; a full reload of the editor loses its current in-memory images.

The frontend still proxies `/api/` to the unchanged API container, so payment/admin routes must remain healthy. Do not run volume deletion or change the encryption key. A frontend rollback uses the previous IMAGE_TAG with the same two Compose files and a web-only recreate.

## 2. Fix the observed www certificate mismatch separately

The main apex HTTPS site already works. Do not replace its active certificate or vhost with an unvalidated www setup. The new templates are optional alongside the existing apex site and are not automatically installed by Docker.

First inspect DNS and existing vhosts:

```bash
getent ahosts www.photoresizekaro.in
sudo nginx -T 2>/dev/null | grep -n 'www.photoresizekaro.in'
sudo certbot certificates
```

Set a DNS CNAME `www` → `photoresizekaro.in` (or an A record to the correct VPS) if needed. Do not disturb existing A/MX/TXT records, including Search Console verification. If an AAAA record exists, its IPv6 endpoint must also serve this host correctly. Do not guess a new address or remove records blindly. Review any existing www vhost instead of enabling a duplicate.

If no www vhost exists, install the HTTP-only bootstrap as a **separate** site after checking the target files do not already exist:

```bash
sudo cp -n deploy/nginx-www-http.conf /etc/nginx/sites-available/photoresizekaro-www
sudo ln -s /etc/nginx/sites-available/photoresizekaro-www /etc/nginx/sites-enabled/photoresizekaro-www
sudo nginx -t && sudo systemctl reload nginx
```

Stop on an error. Verify HTTP challenge routing publicly before requesting the expanded certificate:

```bash
printf 'photoresizekaro-www-check\n' | sudo tee /var/www/letsencrypt/.well-known/acme-challenge/photoresizekaro-www-check > /dev/null
curl -fsS http://www.photoresizekaro.in/.well-known/acme-challenge/photoresizekaro-www-check
```

When DNS and that check succeed, expand the existing named certificate with **both** names:

```bash
sudo certbot certonly --webroot -w /var/www/letsencrypt \
  --cert-name photoresizekaro.in --expand \
  -d photoresizekaro.in -d www.photoresizekaro.in
```

Confirm success and both names in `sudo certbot certificates`. Only then back up the www HTTP file and install the HTTPS redirect:

```bash
sudo cp -p /etc/nginx/sites-available/photoresizekaro-www /etc/nginx/sites-available/photoresizekaro-www.http-backup
sudo cp deploy/nginx-www-https.conf /etc/nginx/sites-available/photoresizekaro-www
sudo nginx -t && sudo systemctl reload nginx
curl -I https://www.photoresizekaro.in/resize-image-to-50kb
```

Expect a valid TLS connection and a 301 Location to `https://photoresizekaro.in/resize-image-to-50kb`. The existing apex vhost and other projects stay in place. Test renewal with the existing deploy hook when the ACME staging endpoint is reachable:

```bash
sudo certbot renew --cert-name photoresizekaro.in --dry-run --run-deploy-hooks
```

A renewal dry-run previously failed because staging TLS was unreachable; do not count renewal as verified until it succeeds. No certificate change or remote Nginx mutation was performed during local development. [Certbot's certificate update guide](https://eff-certbot.readthedocs.io/en/stable/using.html#re-creating-and-updating-existing-certificates) documents named certificates and expansion.

## 3. Search Console and traffic measurement

Your Domain property is already verified. Keep the DNS TXT record. Resubmit `https://photoresizekaro.in/sitemap.xml` and confirm success with the expanded URL count. Inspect the 50 KB and signature tool URLs: test live, check the rendered page and canonical, and request indexing once if appropriate. Google chooses whether and when to index/rank a page.

Use Search results → Queries/Pages to establish a baseline, then compare 28-day windows and a seven-day click average. The 100/day goal is organic traffic: the owner dashboard's anonymous browser visits include other traffic and are not a substitute for Search Console clicks. The [competitor and keyword review](seo-competitor-audit.md) includes candidate priorities and a measurement plan without invented volume figures.

Run PageSpeed Insights on the deployed pages and use Search Console's real-user Core Web Vitals report when data exists. The development review did not produce a usable PageSpeed score. Do not claim a 100/100 SEO/performance score or a ranking guarantee from metadata checks.
