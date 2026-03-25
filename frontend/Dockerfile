####
# Multi-stage Dockerfile for the UNIGEvents React/Vite frontend.
#
# Stage 1 — Build the production bundle with Node.js
# Stage 2 — Serve the static files with Nginx
#
# Build:
#   docker build -t unigevents-frontend .
#
# Run:
#   docker run -p 80:80 unigevents-frontend
###

# ── Stage 1: Build ──────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────
FROM nginx:stable-alpine

# Copy the built files to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: redirect all requests to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
