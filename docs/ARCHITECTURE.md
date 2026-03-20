# System Architecture

This document describes the high-level architecture of the **UNIGEvents** application.

---

## Overview

UNIGEvents is a web-based platform that allows users to discover and manage university events.

The architecture is based on three main components:

- **Frontend** — Single Page Application (React / Vite)
- **Backend** — REST API (Java 17 / Quarkus)
- **Database** — PostgreSQL

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
+-------------------+
| Backend API       |
| Java / Quarkus    |
+---------+---------+
          |
          | SQL (Hibernate ORM)
          v
+-------------------+
| PostgreSQL        |
| Database          |
+-------------------+
```

Each component runs inside a Docker container, orchestrated locally via Docker Compose.

---

## Frontend

The frontend is a Single Page Application (SPA) built with **React** and bundled by **Vite**.

Responsibilities:

- User interface and navigation
- Event browsing and visualization
- Sending requests to the backend API
- Rendering data returned by the backend

The frontend communicates exclusively with the backend through HTTP requests. Direct access to the database is not allowed.

---

## Backend

The backend is implemented using **Java 17 with the Quarkus framework**.

Responsibilities:

- Business logic and event management
- Data validation (Bean Validation)
- REST API endpoints (`/api/events`)
- Database access via Hibernate ORM with Panache

The backend exposes a REST API consumed by the frontend. See the [API specification](API.md) for details.

---

## Database

The system uses **PostgreSQL** as its relational database.

Stored data:

- Events (title, description, date, location)
- Users and event metadata (future)

The database is accessed only by the backend service, never directly by the frontend.

---

## Local Development

Two options are available for local development:

| Option | How it works | See |
|--------|-------------|-----|
| **Dev Container** (recommended) | VS Code runs inside a Docker container with all tools pre-installed. PostgreSQL starts automatically. | [Installation Guide](INSTALL.md) |
| **Manual setup** | Install Java, Node, and Docker locally. Start PostgreSQL via Docker Compose, then run backend and frontend manually. | [Installation Guide](INSTALL.md) |

For deploying the full stack (backend + DB) as containers, see the [Deployment Guide](DEPLOYMENT.md).
