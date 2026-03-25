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
# 1. Copy environment file
cp docker/.env.example docker/.env

# 2. Build the backend JAR with the dev profile (required before first run and after code changes)
# macOS:
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
# Linux:
./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev

# 3. Start the stack
docker compose -f docker/docker-compose.yml up --build
```

See the [Deployment Guide](../docs/DEPLOYMENT.md) for full instructions.

---

## Architecture

| Container | Image | Port |
|-----------|-------|------|
| `unigevents-db` | `postgres:17-alpine` | `5432` |
| `unigevents-backend` | Built from `backend/` | `8080` |
