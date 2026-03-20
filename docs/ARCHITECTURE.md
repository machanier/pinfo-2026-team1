# System Architecture

This document describes the high-level architecture of the **UNIGEvents** application.

---

## Overview

UNIGEvents is a web-based platform that allows users to discover and manage university events.

The architecture is based on:

- **Frontend** — Single Page Application (React / Vite)
- **Backend** — Six Java 17 / Quarkus microservices
- **Databases** — Six isolated PostgreSQL instances (one per microservice)

```
+-------------------+
| Web Browser       |
| (User Client)     |
+---------+---------+
          |
          | HTTP/HTTPS
          v
+-------------------+
| Frontend (SPA)    |
| React / Vite      |
+---------+---------+
          |
          | REST API (JSON over HTTP)
          v
+-------------------+    +---------------------+
| User Service      | -> | user_service_db     |
| :8081             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Event Service     | -> | event_service_db    |
| :8082             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Registration Svc  | -> | registration_db     |
| :8083             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Notification Svc  | -> | notification_db     |
| :8084             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Search Service    | -> | search_service_db   |
| :8085             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Moderation Svc    | -> | moderation_db       |
| :8086             |    | PostgreSQL          |
+-------------------+    +---------------------+
```

Each database runs in Docker during local development. Microservices run in Quarkus dev mode.

---

## Frontend

The frontend is a Single Page Application (SPA) built with **React** and bundled by **Vite**.

Responsibilities:

- User interface and navigation
- Event browsing and visualization
- Sending requests to backend APIs
- Rendering data returned by backend services

The frontend communicates exclusively with backend APIs through HTTP requests. Direct access to databases is not allowed.

---

## Backend Microservices

The backend is implemented with **Java 17 and Quarkus** as six deployable services:

- **User Service** (`:8081`) — users
- **Event Service** (`:8082`) — events
- **Registration Service** (`:8083`) — event registrations
- **Notification Service** (`:8084`) — notifications
- **Search Service** (`:8085`) — search documents
- **Moderation Service** (`:8086`) — moderation flags

Each service has:

- Its own codebase module in [backend](../backend)
- Its own PostgreSQL schema and credentials
- Its own Quarkus application configuration

See the [API specification](API.md) for endpoint details.

---

## Databases

The system uses **PostgreSQL** with one database per service:

- `user_service_db`
- `event_service_db`
- `registration_service_db`
- `notification_service_db`
- `search_service_db`
- `moderation_service_db`

Each database is accessed only by its owning service.

---

## Local Development

Two options are available for local development:

| Option | How it works | See |
|--------|-------------|-----|
| **Dev Container** (recommended) | VS Code runs inside a Docker container with all tools pre-installed. Start the backend database stack, then run services via tasks. | [Installation Guide](INSTALL.md) |
| **Manual setup** | Install Java, Node, and Docker locally. Start all databases via Docker Compose, then run backend services and frontend manually. | [Installation Guide](INSTALL.md) |

For local deployment details, see the [Deployment Guide](DEPLOYMENT.md).
