# Dev stage
FROM node:22-alpine AS dev

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

ARG PUBLIC_DOMAIN=sidebadger.me
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}

EXPOSE 4321
# dev:host, not dev: `npm run dev` restarts this container from the host
CMD ["npm", "run", "dev:host", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

ARG PUBLIC_DOMAIN=sidebadger.me
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}
RUN npm run build

# Production stage - nginx serves the static files and owns their HTTP headers
FROM nginx:1.27-alpine
# conf.d/*.conf is auto-included as server-level config, so only default.conf goes there.
# Any other nginx/*.conf (for example locale-redirects.conf) lands in /etc/nginx/side-badger/
# and is pulled in by an explicit include, so it can never become a second server block.
COPY nginx/*.conf /etc/nginx/side-badger/
RUN mv /etc/nginx/side-badger/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# 127.0.0.1, not localhost: busybox wget tries ::1 first, and nginx listens on IPv4 only
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/health || exit 1

EXPOSE 80
