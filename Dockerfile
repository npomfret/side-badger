# Base stage with dependencies
FROM node:22-alpine AS base

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Development stage - for local dev with hot reload
FROM base AS dev

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS builder

# Accept domain as build arg (default: sidebadger.me)
ARG PUBLIC_DOMAIN=sidebadger.me
ENV PUBLIC_DOMAIN=${PUBLIC_DOMAIN}

# Build the site with the specified domain
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
