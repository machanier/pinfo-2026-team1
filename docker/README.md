# Docker

This folder contains the Docker configuration for the **UNIGEvents** application.

---

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Starts PostgreSQL + Quarkus backend for local development |
| `.env.example` | Template for environment variables — copy to `.env` before starting |

> `.env` is git-ignored. Never commit it.

---

## Quick Start

```bash
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml up
```

See the [Deployment Guide](../docs/DEPLOYMENT.md) for full instructions.

---

## Architecture

| Container | Image | Port |
|-----------|-------|------|
| `unigevents-db` | `postgres:16-alpine` | `5432` |
| `unigevents-backend` | Built from `backend/` | `8080` |
