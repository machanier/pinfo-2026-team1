# Deployment Guide

This document describes how to run the **UNIGEvents** application locally and in production.

---

## Local Development (Docker Compose)

The recommended way to run the full stack locally is via Docker Compose.

### Prerequisites

- Docker Desktop installed and running ([installation guide](INSTALL.md))
- Repository cloned

### Steps

**1. Create your local environment file:**

```bash
cp docker/.env.example docker/.env
```

Edit `docker/.env` if needed (default values work out of the box).

**2. Start the services:**

```bash
docker compose -f docker/docker-compose.yml up
```

This starts:

| Service | URL |
|---------|-----|
| PostgreSQL database | `localhost:5432` |
| Quarkus backend API | `http://localhost:8080/api/events` |
| Swagger UI | `http://localhost:8080/swagger-ui` |

**3. Stop the services:**

```bash
docker compose -f docker/docker-compose.yml down
```

To also delete the database volume (reset all data):

```bash
docker compose -f docker/docker-compose.yml down -v
```

---

## Production Deployment (University Server)

The application will be deployed on university servers.
Instructions will be added once server access is configured.

---

## Future Kubernetes Deployment

Kubernetes may be used to orchestrate containers in a later phase of the project.

Possible targets include:

- Cloud platforms
- On-premise servers
- University infrastructure

---

## Environment Configuration

Environment variables may be used for:

- Database connection settings
- API configuration
- Security parameters
- Deployment-specific options