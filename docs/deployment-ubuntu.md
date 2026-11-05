# Deploy photoresizekaro.in on your existing Ubuntu server

Prepared 4 November 2026 for:

**For the optional payment/API release, continue with [payments-deployment.md](payments-deployment.md).** This original guide describes the static free launch. The payment release needs the additional API service, separate PostgreSQL database/role, server-only credentials, opt-in Compose overlay and updated host request-body limit. Once enabled, use both Compose files for updates.

- Repository: `https://github.com/Rahul2749/PhotoResizer`
- Domain: `photoresizekaro.in`
- Support: `support@photoresizekaro.in`
- Host-installed Nginx and Certbot, as confirmed by your screenshots.
- Existing Task Manager site on `taskmanager.shape2real.in`, app port `127.0.0.1:8080`, PostgreSQL port `127.0.0.1:5433`.

PhotoResizeKaro uses a separate Compose project named `photoresizekaro`, a separate Nginx site file, and **127.0.0.1:8088**. Run its Compose commands from `/opt/photoresizekaro`. No database, Node runtime, image-upload API or SMTP service is needed in its production container.

Run the commands in order and stop if any command fails. Replace `YOUR_SERVER_IP` with the VPS public address; a previous SSH login's client address is not necessarily the server address.

```
Phone / browser -- HTTPS --> Ubuntu Nginx + Certbot
                                      |
                         http://127.0.0.1:8088
                                      |
                          unprivileged Docker Nginx :8080
                                      |
                          generated static site + worker

Selected photos and signatures are processed on the visitor's device.
```

## 1. Put the prepared source in GitHub

At preparation time the remote returned no Git refs. The files prepared in `C:\Github\PhotoResizeKaro` must reach the repository before the server can clone and build this release. These instructions do not imply that a remote push has already happened.

In PowerShell on your computer:

```powershell
cd C:\Github\PhotoResizeKaro
git init -b main
git remote add origin https://github.com/Rahul2749/PhotoResizer.git
git status
git add .
git commit -m "Prepare PhotoResizeKaro production deployment"
git push -u origin main
```

If you already initialized Git, reuse the checkout and existing `origin` rather than adding it twice. Use `git remote -v` to confirm its URL. If Git requests your commit identity, configure your own name/email. GitHub authentication may open a browser or require your normal credential flow; do not put a token in the remote URL or repository files. If the remote has gained commits, fetch and integrate them instead of force-pushing.

The included CI runs tests and production checks on pushes and pull requests. It does not deploy to the VPS or require SSH secrets. Wait for it to pass before production changes. CI and base images are pinned; Dependabot proposes updates.

### Alternative: transfer the source archive

If you prefer to deploy before setting up Git on the VPS, use the provided source archive. In PowerShell, replace `YOUR_SERVER_IP` with your VPS public address:

```powershell
scp .\release\photoresizekaro-source-2026-11-04.tar.gz root@YOUR_SERVER_IP:/tmp/
```

On the server, extract into an empty application directory:

```bash
mkdir -p /opt/photoresizekaro
tar -xzf /tmp/photoresizekaro-source-2026-11-04.tar.gz -C /opt/photoresizekaro
cd /opt/photoresizekaro
```

Then skip the `git clone` part of step 3. The archive excludes dependencies, generated build output, credentials, `.git` and test artifacts.

## 2. Confirm DNS and the server's existing setup

Create an **A record** for `@` / `photoresizekaro.in` pointing to your VPS public IPv4 address. Add an AAAA record only if the VPS has working public IPv6. A wrong AAAA record can cause certificate validation or visitor failures even when the A record is correct. `www` is optional and is not required by these initial configurations.

In your existing server SSH session:

```bash
docker --version
docker compose version
sudo nginx -t
sudo certbot certificates
sudo ss -ltnp | grep -E ':(80|443|8080|8088|5433)\b'
sudo nginx -T 2>/dev/null | grep -n 'server_name'
```

Check that port **8088** is free and that there is no existing conflicting `server_name photoresizekaro.in` block. Reuse or back up an existing block for this same domain if one exists; do not create a duplicate. Keep the Task Manager site file and containers separate. Your screenshots show its app container was stopped; this guide does not change that choice.

If `docker compose` is unavailable, install the Compose v2 plugin using Docker's instructions for your existing Docker installation; do not replace the Docker daemon or stop the other application just to follow this guide.

Ports 80 and 443 must be reachable in your provider firewall. If UFW is already active, check the existing rules and allow HTTP/HTTPS as needed:

```bash
sudo ufw status
sudo ufw allow 'Nginx Full'
```

Do not enable/reset a firewall without retaining your SSH access. Do not open port 8088 publicly; Compose binds it only to loopback. If you use a CDN proxy, start with DNS-only while validating the origin and certificate, then verify the CDN's TLS mode separately.

## 3. Clone and build the application

If using Git, from the server:

```bash
sudo mkdir -p /opt/photoresizekaro
sudo chown "$(id -un):$(id -gn)" /opt/photoresizekaro
git clone --branch main https://github.com/Rahul2749/PhotoResizer.git /opt/photoresizekaro
cd /opt/photoresizekaro
```

This assumes the application directory is empty. If it is already a checkout of this repository, inspect `git status` and reuse it. For a private repository use your normal read-only GitHub deploy key or credential setup. Do not embed personal tokens in shell history.

Configure the image tag and loopback port:

```bash
cp .env.example .env
chmod 600 .env
docker compose config --quiet
docker compose build --pull
docker compose up -d --no-build --wait --wait-timeout 60
docker compose ps
curl -fsS http://127.0.0.1:8088/healthz
docker compose exec -T web nginx -t
```

Expected health response: `ok`. The `.env` file contains `APP_PORT=8088` and a release image tag. Keep port 8088 in the Nginx configs below consistent if you change it.

The build runs unit tests, TypeScript/build checks, metadata checks and CSP generation. The runtime contains only Nginx and static files; development dependencies and the Node builder are not shipped in the final stage. The container runs as `nginx`, with a read-only root filesystem, dropped capabilities, temporary writable memory and resource limits.

### If the VPS has too little RAM to build

Build the same Linux image on your computer with Docker Desktop using Linux containers. For a typical x86-64 Ubuntu VPS:

```powershell
docker build --platform linux/amd64 -t photoresizekaro:release-2026-11-04 .
docker save -o .\release\photoresizekaro-image-2026-11-04.tar photoresizekaro:release-2026-11-04
scp .\release\photoresizekaro-image-2026-11-04.tar root@YOUR_SERVER_IP:/tmp/
```

On the VPS:

```bash
docker load -i /tmp/photoresizekaro-image-2026-11-04.tar
cd /opt/photoresizekaro
docker compose up -d --no-build --wait --wait-timeout 60
```

Ensure `.env` uses `IMAGE_TAG=release-2026-11-04`, matching the saved image. Check `uname -m` on the VPS first; use `linux/arm64` instead if it is an ARM server. Keep the source/config files on the server even when loading an image. No registry login is needed for this transfer approach.

## 4. Add a separate HTTP Nginx site

The following copies affect only this application's named site. If the target file already exists, back it up and review it first. Do not replace `/etc/nginx/nginx.conf`, delete the Task Manager site, or run a global Docker stop/prune command.

```bash
cd /opt/photoresizekaro
sudo mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
sudo cp deploy/nginx-http.conf /etc/nginx/sites-available/photoresizekaro
sudo ln -s /etc/nginx/sites-available/photoresizekaro /etc/nginx/sites-enabled/photoresizekaro
sudo nginx -t
sudo systemctl reload nginx
curl -I -H 'Host: photoresizekaro.in' http://127.0.0.1/
```

If the symlink already exists and points to the correct file, reuse it. Reload only after `nginx -t` passes. From a separate device/network, check `http://photoresizekaro.in`.

The bootstrap file serves `/.well-known/acme-challenge/` from `/var/www/letsencrypt`; everything else proxies to the container. Source photos are not uploaded; both the container and the host route impose a small request-body limit rather than the Task Manager site's 50 MB setting.

## 5. Obtain a certificate for this domain

Your existing Task Manager certificate covers its own hostname. Do not copy its certificate paths into this new domain's site.

If `sudo certbot certificates` already lists a valid certificate covering `photoresizekaro.in`, note its exact certificate name and paths and reuse it. Otherwise, after public DNS and HTTP access work:

```bash
sudo certbot certonly --webroot \
  -w /var/www/letsencrypt \
  -d photoresizekaro.in \
  --cert-name photoresizekaro.in
```

Answer Certbot's email and account prompts using your own contact details. This command obtains a separate certificate without rewriting the other website's Nginx configuration. The HTTP-01 challenge needs public port 80. If you already use a different successful DNS challenge workflow, preserve it and use the resulting certificate paths instead.

## 6. Switch the new site to HTTPS

First verify that these paths exist:

```bash
sudo test -f /etc/letsencrypt/live/photoresizekaro.in/fullchain.pem
sudo test -f /etc/letsencrypt/live/photoresizekaro.in/privkey.pem
```

If Certbot reported a name such as `photoresizekaro.in-0001`, edit `deploy/nginx-https.conf` to use those exact existing paths before copying it. Do not invent certificate paths or reuse the Task Manager hostname.

```bash
sudo cp /etc/nginx/sites-available/photoresizekaro /etc/nginx/sites-available/photoresizekaro.http-backup
sudo cp deploy/nginx-https.conf /etc/nginx/sites-available/photoresizekaro
sudo nginx -t
sudo systemctl reload nginx
curl -I http://photoresizekaro.in/
curl -I https://photoresizekaro.in/
```

Expected: HTTP redirects to HTTPS, HTTPS returns 200. The TLS configuration enables TLS 1.2/1.3 and HSTS for this hostname only; it does not preload or apply HSTS to all subdomains. The container supplies the CSP/security headers and static caching; the host adds HSTS and handles TLS.

Do not add another `Content-Security-Policy` header at the host or a CDN. Multiple differing policies can break legitimate scripts. The generated hash list is version-specific and ships with each image. Nginx's proxy header buffers in the provided file accommodate that policy.

## 7. Verify certificate renewal

For the webroot certificate, install a deploy hook that reloads host Nginx after a successful renewal:

```bash
sudo install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/20-photoresizekaro-nginx-reload > /dev/null <<'EOF'
#!/bin/sh
set -eu
/usr/sbin/nginx -t
/bin/systemctl reload nginx
EOF
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/20-photoresizekaro-nginx-reload
sudo certbot renew --cert-name photoresizekaro.in --dry-run --run-deploy-hooks
systemctl list-timers --all | grep -i certbot
```

Use the actual certificate name if it differs. Leave the existing renewal schedule and plugins for other certificates intact; do not add duplicate cron jobs. Depending on how Certbot was installed, its timer can be named `certbot.timer` or managed by Snap. If no existing scheduler is present, follow the official instructions for that installation method before considering deployment complete.

The deploy hook reloads, rather than stops, Nginx. Check that Task Manager's certificate still has its expected independent renewal configuration.

## 8. Public checks before announcing the site

- Open `https://photoresizekaro.in` in a normal and private browser window, on both phone and desktop.
- Confirm the padlock/domain and that HTTP redirects to HTTPS.
- Select actual JPG and PNG files, crop/rotate, process both a photo and signature, inspect the previews and download both files.
- Try CTET and check the generated dimensions/DPI; try SSC and confirm live capture is directed to its official portal.
- Read `/trust`, `/privacy`, `/terms` and `/contact`. Confirm that `support@photoresizekaro.in` can actually send/receive mail; a mail link does not provision a mailbox. Configure the email provider's MX/SPF/DKIM/DMARC through its own instructions.
- Open `/robots.txt` and `/sitemap.xml`, then submit `https://photoresizekaro.in/sitemap.xml` in Search Console after verifying domain ownership.
- Check a nonexistent URL returns 404 rather than the editor.
- Use the offline test without reloading the loaded editor. File selection/edit/download should create no upload requests.
- Review the stored preset dates before launch; initial sources were checked 25 October and are due for maintenance 24 November 2026. No automated source re-verification is claimed.

If Node.js is available on a testing machine, the reusable HTTP smoke checker can target the live site:

```bash
node scripts/smoke-test.mjs https://photoresizekaro.in
```

It uses read-only GET/HEAD requests and one small empty-object POST to confirm that uploads are rejected. It sends no images. Node is not required on the VPS itself.

## 9. Deploy an update and keep a rollback image

In the existing checkout, keep the previous image and configuration until the new release is verified:

```bash
cd /opt/photoresizekaro
cp .env .env.rollback
git status
git pull --ff-only
NEW_TAG="release-$(date -u +%Y%m%d-%H%M%S)"
IMAGE_TAG="$NEW_TAG" docker compose build --pull
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_TAG/" .env
docker compose up -d --no-build --wait --wait-timeout 60
curl -fsS http://127.0.0.1:8088/healthz
curl -I https://photoresizekaro.in/
```

Do not continue after a failed command. Only change `.env` after a successful image build. A single-container update can have a brief interruption while the container is recreated; zero-downtime rolling deployment is not promised.

To return to the saved prior image after a normal app-only update:

```bash
cd /opt/photoresizekaro
cp .env.rollback .env
docker compose up -d --no-build --wait --wait-timeout 60
```

If the update also changed deployment configuration, restore its matching reviewed configuration/commit. Do not prune the old release image until the new one has been tested. Git tags/commit IDs and the image tags should be recorded together for each release.

## 10. Diagnostics

```bash
cd /opt/photoresizekaro
docker compose ps
docker compose logs --tail=100 web
docker compose exec -T web nginx -t
sudo nginx -t
sudo tail -n 100 /var/log/nginx/photoresizekaro-error.log
sudo certbot certificates
```

| Symptom | Check |
|---|---|
| 502 from host Nginx | Container health and `curl http://127.0.0.1:8088/healthz`; the proxy and Compose ports must match. |
| Domain shows another app | DNS, duplicate/default Nginx server blocks, enabled symlink, and HTTPS SNI hostname. |
| Certificate challenge fails | Public A/AAAA records, port 80, CDN configuration, and the webroot challenge location. |
| Blank page / CSP console errors | Use the static files and generated header policy from the same image; remove extra host/CDN CSP overrides and disable injected third-party scripts. |
| Existing browser tab requests an old worker asset | Refresh after keeping needed downloads. The app also has a local fallback when a worker asset cannot load. |
| Build is killed | Build/load a matching-architecture image from your computer instead of adding memory pressure to the shared VPS. |
| Container is unhealthy but still running | Docker health reports status; restart policies alone do not restart merely unhealthy containers. Inspect logs and alert on failed HTTPS/health checks. |

Access logs for this vhost/runtime are disabled in the supplied files. Error logs and infrastructure-provider logs may still include technical request data, as disclosed in the privacy page. Maintain OS/Docker/Nginx/Certbot updates, log rotation, certificate renewal and routine source/preset review using your existing server administration process.

## References

- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports): generated static files can be served by Nginx.
- [Nginx response headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html): header inheritance and `always`; the container avoids child-location header overrides.
- [Docker Compose services](https://docs.docker.com/reference/compose-file/services/): loopback port bindings, read-only filesystems, health and resource settings.
- [Certbot certificate renewal](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates): dry runs and successful-renewal deploy hooks.
