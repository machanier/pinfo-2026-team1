# Docker

This folder contains the Docker configuration for the **UNIGEvents** application.

---

## Files

| File                 | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `docker-compose.yml` | Canonical local stack (Postgres DBs + Kafka + Elasticsearch + Mailhog by default; optional `fullstack` profile adds the backend services, Kong & frontend) |
| `.env.example`       | Template for environment variables — copy to `.env` before starting |

> `.env` is git-ignored. Never commit it.

---

## Quick Start

```bash
# 1. Copy environment file
cp docker/.env.example docker/.env

# 2. Start the default stack (6 Postgres DBs + Kafka + Elasticsearch + Mailhog)
docker compose -f docker/docker-compose.yml up -d

# Optional: start full stack (DB + backend services + Kong)
docker compose -f docker/docker-compose.yml --profile fullstack up -d

# 3. Optional but recommended: build backend artifacts with the dev profile
#    (useful before first run, and after code changes affecting build-time config)
# macOS:
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
# Linux:
./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev

# 4. Start a backend microservice (example)
cd backend
./mvnw -pl user-service quarkus:dev

# 5. Stop database containers when finished (Optional but recommended)
cd ..
docker compose -f docker/docker-compose.yml down
```

See the [Deployment Guide](../docs/DEPLOYMENT.md) for full instructions.

---

## Architecture

| Container         | Image                | Port   |
| ----------------- | -------------------- | ------ |
| `user-db`         | `postgres:17-alpine` | `5433` |
| `event-db`        | `postgres:17-alpine` | `5434` |
| `registration-db` | `postgres:17-alpine` | `5435` |
| `notification-db` | `postgres:17-alpine` | `5436` |
| `search-db`       | `postgres:17-alpine` | `5437` |
| `moderation-db`   | `postgres:17-alpine` | `5438` |

Also started by default (shared infrastructure):

| Container       | Image                         | Port(s)                       |
| --------------- | ----------------------------- | ----------------------------- |
| `kafka`         | `confluentinc/cp-kafka:7.6.0` | `9092`, `9094`                |
| `elasticsearch` | `elasticsearch:8.13.0`        | `9200`                        |
| `mailhog`       | `mailhog/mailhog:latest`      | `1025` (SMTP), `8025` (web UI) |

Optional fullstack profile exposes:

| Container               | Port(s)     |
| ----------------------- | ----------- |
| `user-service`          | `8081`      |
| `event-service`         | `8082`      |
| `notification-service`  | `8083`      |
| `moderation-service`    | `8084`      |
| `search-service`        | `8085`      |
| `registration-service`  | `8086`      |
| `kong`                  | `8000/8001` |
| `frontend`              | `3000`      |
