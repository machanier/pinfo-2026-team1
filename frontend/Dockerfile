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
#   docker run -p 8080:8080 unigevents-frontend
#
# PINFO-180: switched to the official nginx-unprivileged image so the
# container runs as UID 101 (nginx) instead of root. As a side-effect
# nginx now binds 8080 instead of 80 (UIDs >0 cannot bind <1024 by
# default), so nginx.conf, the K8s Service targetPort and the
# docker-compose port mapping all reference 8080.
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
# nginx-unprivileged drops to UID 101 and writes its pid/temp files to
# /tmp instead of /var/run, so it works under runAsNonRoot in K8s.
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy the built files to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: redirect all requests to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
