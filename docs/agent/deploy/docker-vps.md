# Deploy: Docker / own server (VPS)

Full control. Works on any box with Docker (Hetzner, DigitalOcean, Coolify, …).
**The `kit-data` volume is the persistence** — without it, published settings/logo/
claps die with the container.

## Plain Docker

```sh
docker build -t steady-page-kit .
docker run -d --name steady-page-kit \
  --restart unless-stopped \
  -p 127.0.0.1:8788:8788 \
  -v kit-data:/app/data \
  -e KIT_ADMIN_CODE=<code> \
  -e FULLTEXT_FEED_URL=<url> \
  steady-page-kit
```

(Or `--env-file .env` instead of the two `-e` flags.)

## Reverse proxy (TLS)

Caddy (automatic HTTPS) — `/etc/caddy/Caddyfile`:
```
example.com {
    reverse_proxy 127.0.0.1:8788
}
```
nginx equivalent: `proxy_pass http://127.0.0.1:8788;` + certbot.
The server honors `x-forwarded-proto`/`host` for canonical URLs — standard proxy
headers are enough.

## Without Docker (bare Node)

```sh
npm install --omit=dev   # no runtime deps; this is effectively a no-op
KIT_ADMIN_CODE=<code> PORT=8788 node server/node.js
```
Use systemd to keep it alive:
```ini
[Unit]
Description=steady-page-kit
After=network.target

[Service]
WorkingDirectory=/opt/steady-page-kit
ExecStart=/usr/bin/node server/node.js
EnvironmentFile=/opt/steady-page-kit/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Then set `siteOrigin` in `kit.config.js` to the final https URL and restart.
Verify per SETUP.md §6.
