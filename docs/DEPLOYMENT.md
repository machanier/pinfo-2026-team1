# Deployment Guide

This document describes how to run the **UNIGEvents** application as containers using Docker Compose.

> For day-to-day development (Dev Container or manual setup), see the [Installation Guide](INSTALL.md).

---

## Docker Compose Deployment

This runs the **backend + database** as Docker containers. Useful for integration testing or demoing the full stack.

### Prerequisites

- Docker Desktop installed and running ([installation guide](INSTALL.md))
- Repository cloned

### Steps

**1. Create your local environment file:**

```bash
cp docker/.env.example docker/.env
```

Edit `docker/.env` if needed (default values work out of the box).

**2. Build the backend JAR** (required before the first `docker compose up` or after any code change):

On macOS:

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

**3. Start the services:**

```bash
docker compose -f docker/docker-compose.yml up --build
```

This starts:

| Service             | URL                                |
| ------------------- | ---------------------------------- |
| PostgreSQL database | `localhost:5432`                   |
| Quarkus backend API | `http://localhost:8080/api/events` |
| Swagger UI          | `http://localhost:8080/swagger-ui` |

**4. Stop the services:**

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

| Variable       | Purpose                   | Default      |
| -------------- | ------------------------- | ------------ |
| `DB_NAME`      | PostgreSQL database name  | `unigEvents` |
| `DB_USER`      | PostgreSQL user           | `postgres`   |
| `DB_PASSWORD`  | PostgreSQL password       | `postgres`   |
| `DB_PORT`      | PostgreSQL host port      | `5432`       |
| `BACKEND_PORT` | Quarkus backend host port | `8080`       |

---

## Production Deployment

The application will be deployed on university servers. Instructions will be added once server access is configured.
