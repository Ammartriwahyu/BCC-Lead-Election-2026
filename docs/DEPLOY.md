# Deploying the frontend

For whoever runs the server. The frontend is one Next.js server (Node). It serves the pages and `/api/*`, which it forwards to the backend with the session token (BFF, see `docs/INTEGRATION.md`). Browsers never call the backend directly.

```
browser ──https──▶ nginx ──▶ Next server (127.0.0.1:3000) ──▶ API_BASE_URL/api/*
```

## 1. Requirements

- Node 24 or newer, pnpm 12 (`corepack enable` picks the version from `package.json`).
- Deploy branch: `main`.

## 2. Build

```bash
pnpm install --frozen-lockfile
IMAGE_REMOTE_PATTERNS='https://pilketum.bccdev.id/**' pnpm build:standalone
```

`pnpm build:standalone` always builds without the mock API. Build-time variables (baked into the build):

| Variable                 | Value                           | Purpose                                                                                             |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `IMAGE_REMOTE_PATTERNS`  | `https://pilketum.bccdev.id/**` | Fallback for photo URLs of another shape. Photos are read from `API_BASE_URL` (`/candidate-photos`) |
| `NEXT_PUBLIC_BOOTH_MODE` | `true` (default, leave it)      | Shared-device mode: idle sign-out after 90 s, auto sign-out after vote                              |

Then put the static files next to the server (Next does not copy them):

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

`.next/standalone` is now the whole app: it can be copied to the server on its own (no `node_modules` install needed there).

## 3. Run

Runtime variables (read at start, one set per environment). Keep them in the service's environment file, never in the repo:

| Variable             | Staging                                                                   | Production                   |
| -------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| `API_BASE_URL`       | `https://pilketum.bccdev.id/staging`                                      | `https://pilketum.bccdev.id` |
| `BFF_SECRET`         | staging secret                                                            | production secret            |
| `TRUSTED_PROXY_HOPS` | `1` (nginx only; add 1 per extra proxy that appends to `X-Forwarded-For`) | same                         |
| `PORT`               | `3000`                                                                    | `3000`                       |
| `HOSTNAME`           | `127.0.0.1` (only nginx reaches it)                                       | same                         |
| `NODE_ENV`           | `production`                                                              | `production`                 |

`API_BASE_URL` has no trailing `/api`. `BFF_SECRET` is the `X-BFF-Secret` the backend checks before it trusts `X-Client-IP`; without it the server logs a warning once and the backend sees every voter as this server's IP (rate limits).

```bash
node .next/standalone/server.js
```

Example systemd unit (`/etc/systemd/system/pilketum-frontend.service`):

```ini
[Unit]
Description=Pilketum frontend
After=network.target

[Service]
WorkingDirectory=/srv/pilketum-frontend
EnvironmentFile=/etc/pilketum-frontend.env
ExecStart=/usr/bin/node server.js
Restart=always
User=pilketum

[Install]
WantedBy=multi-user.target
```

(`/srv/pilketum-frontend` holds the contents of `.next/standalone`.) pm2 or Docker work the same way: run `server.js` with the variables above.

## 4. nginx

HTTPS ends at nginx. Forward the host, the client IP and the scheme: the session cookies get `Secure` only when `X-Forwarded-Proto` is `https`.

```nginx
# Live streams (server-sent events): no buffering, long reads.
location ~ ^/api/(display|election|admin)/stream$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 3m;   # candidate photos up to 2 MB
}
```

If a CDN or another proxy sits in front of nginx, it must not buffer or cache `text/event-stream` either, and `TRUSTED_PROXY_HOPS` goes up by one.

## 5. After each deploy

1. `https://<host>/api/health` answers `200 {"ok":true}` (the BFF reaches the backend).
2. `/sign-in` shows the voting status strip; `/display` shows the screen on air.
3. A committee sign-in at `/admin/sign-in` reaches the overview, and the turnout follows a test vote within a second or two (the stream works through nginx).
4. Optional, from a checkout: `pnpm contract:check <API_BASE_URL>` checks the backend itself against the frontend's contract (`docs/INTEGRATION.md` §2).

## 6. Updating

Build again from the new `main`, replace the folder, restart the service. Sessions live in the backend, so signed-in voters and committee members stay signed in across a restart; the pages reconnect their streams on their own.
