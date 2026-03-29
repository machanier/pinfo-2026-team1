# Deployment Guide

This document describes how to run the **UNIGEvents** application as containers using Docker Compose.

> For day-to-day development (Dev Container or manual setup), see the [Installation Guide](INSTALL.md).

---

## Docker Compose Deployment

This setup runs the **database layer for all backend microservices** in Docker. Backend services are then run in Quarkus dev mode.

### Prerequisites

- Docker Desktop installed and running ([installation guide](INSTALL.md))
- Repository cloned

### Steps

**1. Create your local environment file:**

```bash
cp docker/.env.example docker/.env
```

Edit `docker/.env` if needed (default values work out of the box).

**2. (Optional) Build backend artifacts with the dev profile:**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
```

On Linux (adjust the path to your JDK 21 installation if needed):

```bash
./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
```

> **Why `-Dquarkus.profile=dev`?**
> Some Quarkus properties (like `schema-management.strategy` and `sql-load-script`) are resolved at **build time**.
> Building with the `dev` profile ensures the schema is recreated on startup and `import.sql` seed data is loaded.

**3. Start the database containers:**

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts:

| Service         | URL              |
| --------------- | ---------------- |
| User DB         | `localhost:5433` |
| Event DB        | `localhost:5434` |
| Registration DB | `localhost:5435` |
| Notification DB | `localhost:5436` |
| Search DB       | `localhost:5437` |
| Moderation DB   | `localhost:5438` |

**4. Start backend services (one terminal per service):**

```bash
cd backend
./mvnw -pl user-service quarkus:dev
./mvnw -pl event-service quarkus:dev
./mvnw -pl registration-service quarkus:dev
./mvnw -pl notification-service quarkus:dev
./mvnw -pl search-service quarkus:dev
./mvnw -pl moderation-service quarkus:dev
```

**5. Stop containers:**

```bash
docker compose -f docker/docker-compose.yml down
```

To also delete the database volume (reset all data):

```bash
docker compose -f docker/docker-compose.yml down -v
```

---

## Environment Variables

Environment variables are defined in `docker/.env` (see `docker/.env.example` for defaults).

See [docker/.env.example](../docker/.env.example) for all variables.

Variables are grouped by microservice database:

- `USER_DB_*`
- `EVENT_DB_*`
- `REGISTRATION_DB_*`
- `NOTIFICATION_DB_*`
- `SEARCH_DB_*`
- `MODERATION_DB_*`

---

## Using Pre-built Images (from CD)

Instead of building locally, you can pull the latest images from GitHub Container Registry:

```bash
docker pull ghcr.io/machanier/pinfo-2026-team1/backend:latest
docker pull ghcr.io/machanier/pinfo-2026-team1/frontend:latest
```

These images are automatically built and pushed by the [CD pipeline](CI-CD.md) on every merge to `develop`.

---

## Production Deployment

The application will be deployed on university servers (Kubernetes). Instructions will be added once server access is configured.
