# Dev stage
FROM node:22-alpine AS dev

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

ARG PUBLIC_DOMAIN=sidebadger.me
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}

EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

ARG PUBLIC_DOMAIN=sidebadger.me
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}
RUN npm run build

# Production stage - serve static files
FROM node:22-alpine

RUN npm install -g serve
COPY --from=builder /app/dist /app/dist

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80
CMD ["serve", "/app/dist", "-l", "80"]
