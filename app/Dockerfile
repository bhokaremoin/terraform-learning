# Multi-stage: build the SPA in node, serve the built static files from nginx.
# The final image carries only nginx + dist/ — small, no Node runtime in prod.

# -------- Stage 1: build --------
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better Docker layer caching when only sources change).
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the app source and build.
COPY . .
RUN npm run build

# -------- Stage 2: runtime --------
FROM nginx:1.27-alpine AS runtime

# SPA fallback config (serves index.html for unknown routes so client-side
# routing works on hard refresh).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built static assets.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx's default CMD is fine: nginx -g "daemon off;"
