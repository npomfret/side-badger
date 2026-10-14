# Own the HTTP config behind the Snowmonkey edge

## Status

Done on 2026-10-12. The site serves its own HTTP config, and the edge (`snowmonkey-proxy-common` `aec2884`) proxies to the `side-badger` alias through `app-edge.inc`.

## Objective

Make this repo the owner of everything sidebadger.me says over HTTP: response headers, caching, body limits, error pages, compression. The shared proxy in `snowmonkey-proxy-common` keeps only the edge: DNS, the certificate, ACME, TLS, HSTS, per-IP abuse limits, its access log and the uptime probe. After this, a change to how the site is served ships with the site, through this repo's CI, and needs no deploy of the proxy repo.

The contract this follows is "F. Bring your own nginx" in `snowmonkey-proxy-common/docs/PATTERNS.md`. Read it before starting.

## How it works today

- **Production** is `docker-compose.prod.yml`, service `website-me`, container `side-badger-website-me`, image `ghcr.io/npomfret/side-badger:latest-me`. `.github/workflows/deploy.yml` builds the image on push to `main`, copies the compose file to `/opt/side-badger-website/` and runs `docker compose up -d --remove-orphans`. `scripts/deploy.sh` is gitignored, builds from the local `docker-compose.yml` and is not the deploy path.
- **The container is not nginx.** The production stage of the `Dockerfile` runs Node `serve` on :80. The README's "Docker + Nginx" is out of date. `src/pages/robots.txt.ts` expects an nginx `sub_filter` to replace `__NGINX_HOST__`, and nothing does: the live robots.txt reads `Sitemap: https://__NGINX_HOST__/sitemap-index.xml`.
- **Every security header comes from the edge.** The `sidebadger.me www.sidebadger.me` HTTPS block in the proxy repo's `nginx/conf.d/default.conf` includes `security-headers.inc`, which sends:

  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header Content-Security-Policy "frame-ancestors 'self'; upgrade-insecure-requests" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Resource-Policy $cross_origin_resource_policy always;
  ```

  `$cross_origin_resource_policy` is `same-origin` for everything except `/og-image.png`. This site has no `/og-image.png` (its social images are under `/images/<locale>/`), so it gets `same-origin` everywhere.
- The same block sets `client_max_body_size 10M` and uses `proxy-common.inc` (60s timeouts, the edge's per-IP limits). The site takes no request bodies: `POST /` currently returns 200.
- **The network alias.** Compose makes the service name an alias on every network the service joins, so this container answers to `website-me` on `snowmonkey-proxy-network`. The contract wants a project-prefixed name. The edge reaches it today by container name (`http://side-badger-website-me:80`).

Measured through the edge on 2026-10-08:

| Request | Result |
|---|---|
| `/` | 200, the eight headers above, ETag, no `Cache-Control` |
| `/_astro/index.cqeq60qY.css` | 200, `content-encoding: br`, no `Cache-Control` |
| `/pricing` and `/pricing/` | both 200 |
| `/pricing/index.html` | 301 to `/pricing/index` (`serve`'s clean URLs) |
| `/nope` | 404 |
| `/robots.txt` | contains the literal `__NGINX_HOST__` |

## Related, separate stack

This is the marketing site for the bill splitter, `wl-bill-splitter`. The app will be served at `app.sidebadger.me` and `staging.sidebadger.me` by its own stack, with its own front container and alias (`wl-bill-splitter` or `wl-bill-splitter-<env>`, never `side-badger` or `website-me`). This nginx does not route to it, and the app's headers are not this repo's concern. `demo.sidebadger.me` no longer resolves; the site's app links and policy API point at the production app, `app.sidebadger.me`.

## Decision: replace `serve` with nginx in the production image

The production stage becomes `nginx:1.27-alpine` serving `dist/`, the same image `snowmonkey-www` uses on that box. It is still one container. `serve` cannot meet the contract. It has no equivalent of `set_real_ip_from`, so its log records the edge's address for every visitor. It has no body limit, and it can only attach headers per glob in a `serve.json`. nginx does all of that, and it can also mark Astro's hashed assets immutable, which nothing does today.

The cheaper alternative is to keep `serve` and add a `serve.json` with the seven headers. That is one file, but the site would still log the edge as every visitor, accept bodies of any size, and still have no asset caching. Not recommended.

## Target shape

`nginx/default.conf` in this repo, copied into the image:

```nginx
# Behind the Snowmonkey edge (snowmonkey-proxy-common), which terminates TLS,
# owns HSTS and overwrites X-Real-IP with the client it saw.

map $uri $side_badger_cache_control {
    # Astro content-hashes everything here: a changed file gets a new name
    ~^/_astro/  "public, max-age=31536000, immutable";
    # HTML and unhashed files revalidate, so a deploy is never masked by a
    # cached page that points at hashed assets the new image no longer has
    default     "no-cache";
}

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    # The client address the edge saw. Docker's whole range, not today's
    # network subnet, which changes if the network is ever recreated.
    set_real_ip_from 172.16.0.0/12;
    real_ip_header X-Real-IP;

    # Location headers carry a path only. An absolute one would say http://,
    # the scheme this container sees, and bounce through the edge's redirect.
    absolute_redirect off;

    # A static site takes no request bodies
    client_max_body_size 16k;

    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json application/xml
               application/manifest+json image/svg+xml text/plain;

    # Every response header except HSTS, which the edge owns. Server level
    # only: a location with its own add_header would drop all of these.
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "frame-ancestors 'self'; upgrade-insecure-requests" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Cache-Control $side_badger_cache_control always;

    error_page 404 /404.html;

    location / {
        # /pricing and /pricing/ both 200, as they do today. No bare $uri/,
        # which would 301 /pricing to /pricing/ and change the URL policy
        # that tasks/restructure-marketing-site.md has yet to decide.
        try_files $uri $uri/index.html $uri.html =404;
    }

    location = /health {
        access_log off;
        default_type text/plain;
    }
}
```

Production stage of the `Dockerfile`:

```dockerfile
FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1
EXPOSE 80
```

`public/health` already builds to `dist/health`. The healthchecks must use `127.0.0.1`, not `localhost`: in the Alpine image busybox `wget` resolves `localhost` to `::1`, nginx listens on IPv4 only, and the check fails with "connection refused". The Dockerfile and both compose files use `127.0.0.1`. nginx logs to stdout, so `docker logs` and the edge box's Loki pick up the real client addresses.

## Work plan

### 1. Serve the site with nginx

- [x] Add `nginx/default.conf` as above.
- [x] Replace the `serve` production stage in the `Dockerfile` with the nginx stage. Leave the `dev` and `builder` stages alone.
- [x] Build and run it locally: `docker build -t side-badger-nginx . && docker run --rm -p 8080:80 side-badger-nginx`.
- [x] Check `/`, `/pricing`, `/pricing/`, `/fr/`, `/nope`, `/health` and a file under `/_astro/` on `localhost:8080` against the "measured" table. The one intended difference is `/pricing/index.html`, which now returns 200 instead of 301.
- [x] Fix `src/pages/robots.txt.ts` to build the sitemap URL from `import.meta.env.SITE`, not from a `__NGINX_HOST__` placeholder, and drop the comment about `sub_filter`. A placeholder that has to be rewritten on the way out is HTTP config this task is removing, and the replacement never existed.
- [x] Update the README's deployment line and `AGENTS.md`'s Docker section, which describe `serve`.

### 2. Compose

In `docker-compose.prod.yml`:

- [x] Rename the service `website-me` to `side-badger`. The service name is its alias on `snowmonkey-proxy-network`, and the contract wants it project-prefixed.
- [x] Keep `container_name: side-badger-website-me`. The proxy repo's `docker-recover.sh` lists that name, and the edge reaches the site by it until step 4.
- [x] Keep `expose: "80"` and add no `ports:`. Docker's DNAT for a published port runs before UFW, so a published port would be public whatever UFW says. The edge reaches the container over the shared network.
- [x] Remove the `traefik.*` labels. Nothing on the box runs Traefik.
- [x] The first deploy after the rename recreates the container. The CI job's `--remove-orphans` should remove the old `website-me` container first. If `up` fails because the name `side-badger-website-me` is already in use, run `docker rm -f side-badger-website-me` on the box and re-run the workflow. The site is down for seconds either way.

### 3. Ship and verify against the current edge

The new image works behind the current edge, which already sends `X-Real-IP`. Push to `main` and let the workflow deploy it. Until step 4, the edge also adds its own copy of every header, so each one appears twice. That is expected for a short time, but don't leave it: browsers ignore a duplicated `Cross-Origin-Opener-Policy` or `Cross-Origin-Resource-Policy`, so both policies are off while the duplication lasts. Do step 4 the same day.

- [x] The container is healthy: `docker ps --filter name=side-badger-website-me`.
- [x] `docker logs --since 2m side-badger-website-me` shows your own public IP for a request you just made, not a `172.x` address.
- [x] `head -c 100000 /dev/zero | curl -s -o /dev/null -w '%{http_code}\n' --data-binary @- https://sidebadger.me/` returns 413. Only this container can produce it: the edge allows 10M now and 100m after step 4.

### 4. Switch the edge (in `snowmonkey-proxy-common`)

See "Coordination" below. This is a change in that repo, deployed with its `./scripts/deploy.sh`.

### 5. Verify through the switched edge

- [x] `curl -sD - -o /dev/null https://sidebadger.me/` shows each of the seven headers exactly once, `Strict-Transport-Security` exactly once (from the edge), and `Cache-Control: no-cache`.
- [x] A file under `/_astro/` returns `Cache-Control: public, max-age=31536000, immutable` and is compressed.
- [x] `/nope` returns 404 with the site's own 404 page and the same seven headers.
- [x] `/robots.txt` names `https://sidebadger.me/sitemap-index.xml`.
- [x] The step 3 real-IP and 413 checks still pass.
- [x] The `sidebadger.me` probe stays green on the Snowmonkey Sites dashboard.

## Outcome notes

- The first deploy hit the container-name conflict described in step 2. Compose stopped the old container, then could not create the new one, so the site returned 502 until `docker rm -f side-badger-website-me` and `docker compose up -d --remove-orphans` were run on the box.
- Compression first came from this container (gzip). The edge passes an already-encoded response through, so browsers got gzip rather than the edge's brotli, and a request without `Accept-Encoding` carried `Vary: Accept-Encoding` twice. `gzip` was then dropped from `nginx/default.conf`, so the edge compresses: brotli for browsers that accept it, gzip otherwise. Compression is the one item in the objective this repo leaves to the edge.

## Coordination with snowmonkey-proxy-common

The edge switch is a change in that repo, not this one. In the `sidebadger.me www.sidebadger.me` HTTPS server block of `nginx/conf.d/default.conf`:

- remove `include conf.d/security-headers.inc;` (this site now sends its own, and two copies conflict)
- remove `client_max_body_size 10M;` (`app-edge.inc` sets the 100m estate ceiling, and this site enforces its own limit)
- replace the body of `location /` with:

  ```nginx
  set $proxy_upstream http://side-badger:80;
  include conf.d/app-edge.inc;
  ```

Order matters: this repo's change ships first (step 3), and the edge switch follows (step 4). The `side-badger` alias exists only after the step 2 rename has been deployed. Pointing the edge at it earlier gives a 502.

Nothing else in the proxy repo changes. The container name, `docker-recover.sh` entry and the `sidebadger.me` probe target stay as they are.

The redirect-only hostnames (`sidebadger.com`, `sidebadgerme.com`, `demo.sidebadger.com` and `app.sidebadger.com`, plus their `www.` names where present) stay as 301s at the edge, in the proxy repo. Each needs a certificate-bearing server block there anyway, and they never reach this container.

## Not in this task

- A stricter Content-Security-Policy. The site loads Google Fonts, flag SVGs from `cdn.jsdelivr.net`, fetches policies from `app.sidebadger.me`, and uses inline scripts. Tightening it is its own change. This task moves the current policy here unchanged.
- The trailing-slash and canonical URL policy, which belongs to `tasks/restructure-marketing-site.md`. This task keeps today's behaviour.
- The local `docker-compose.yml` still declares `snowmonkey-proxy-network` as external, so local dev needs that network to exist. Production doesn't use that file.
