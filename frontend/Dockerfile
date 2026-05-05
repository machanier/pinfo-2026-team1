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
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

WORKDIR /app

# PINFO-190: Auth0 SPA configuration — the three values that
# Auth0ProviderWithConfig.jsx reads at build time. Vite inlines any
# variable starting with VITE_ into the bundle when running
# `npm run build`, so they must be present BEFORE that step below.
#
# CD pipeline passes them via --build-arg (cd.yml, fed by GitHub
# secrets). For local `docker build` without args, they default to the
# dev-tenant placeholders so a quick local build still produces a
# runnable bundle.
#
# These values are PUBLIC — they ship in the SPA bundle and Auth0
# documents the SPA client ID as non-secret. Do NOT use this mechanism
# for anything that should not appear in the JS bundle.
ARG VITE_AUTH0_DOMAIN=dev-cy8uphtpfx5bdclo.us.auth0.com
ARG VITE_AUTH0_CLIENT_ID=IKgUX6v9fuiIGFvRwq6GTHfc5IHPMZj6
ARG VITE_AUTH0_AUDIENCE=https://api.unigevents.ch
ARG VITE_CLOUDINARY_CLOUD_NAME=dalhwcggw
ARG VITE_CLOUDINARY_UPLOAD_PRESET=unigevents_profil
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────
# nginx-unprivileged drops to UID 101 and writes its pid/temp files to
# /tmp instead of /var/run, so it works under runAsNonRoot in K8s.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:35a4455cd4153d7cd0ae1fcfa42451884ef19848202606f144d9a089376c7e6c

# Copy the built files to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing: redirect all requests to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
