# Docker

This folder contains the Docker configuration for the **UNIGEvents** application.

---

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Starts six PostgreSQL instances (one per backend microservice) |
| `.env.example` | Template for environment variables — copy to `.env` before starting |

> `.env` is git-ignored. Never commit it.

---

## Quick Start

```bash
# 1. Copy environment file
cp docker/.env.example docker/.env

# 2. Start all databases
docker compose -f docker/docker-compose.yml up -d

# 3. Start a backend microservice (example)
cd backend
./mvnw -pl user-service quarkus:dev
```

See the [Deployment Guide](../docs/DEPLOYMENT.md) for full instructions.

---

## Architecture

| Container | Image | Port |
|-----------|-------|------|
| `user-db` | `postgres:16-alpine` | `5433` |
| `event-db` | `postgres:16-alpine` | `5434` |
| `registration-db` | `postgres:16-alpine` | `5435` |
| `notification-db` | `postgres:16-alpine` | `5436` |
| `search-db` | `postgres:16-alpine` | `5437` |
| `moderation-db` | `postgres:16-alpine` | `5438` |
