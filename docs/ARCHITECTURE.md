# System Architecture

This document describes the high-level architecture of the **UNIGEvents** application.

The system follows a classic web architecture composed of a frontend, a backend API, and a database.

---

## Overview

UNIGEvents is a web-based platform that allows users to discover and manage university events.

The architecture is based on three main components:

- Frontend application (React)
- Backend service (Java / Quarkus)
- Database (PostgreSQL)

These components communicate over standard web protocols.

---

## High-Level Architecture Diagram

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
| React             |
+---------+---------+
          |
          | REST API (JSON over HTTP)
          v
+-------------------+
| Backend API       |
| Java / Quarkus    |
+---------+---------+
          |
          | SQL
          v
+-------------------+
| PostgreSQL        |
| Database          |
+-------------------+

Each component runs inside a Docker container.
Containers are orchestrated locally via Docker Compose (development)
and may be managed by Kubernetes in production.
```

---

## Frontend

The frontend is a Single Page Application (SPA) built with **React**.

Responsibilities:

- User interface
- Event browsing and visualization
- User interactions
- Sending requests to the backend API
- Rendering data returned by the backend

The frontend communicates exclusively with the backend through HTTP requests.

---

## Backend

The backend is implemented using **Java with the Quarkus framework**.

Responsibilities:

- Business logic
- Event management
- Data validation
- API endpoints (REST)
- Communication with the database
- Security and authentication (if implemented)

The backend exposes a REST API consumed by the frontend.

---

## Database

The system uses **PostgreSQL** as its relational database.

Responsibilities:

- Persistent storage of application data
- Events
- Users (if implemented)
- Event metadata

The database is accessed only by the backend service.

---

## Communication

The components communicate as follows:

Frontend → Backend:
- HTTP/HTTPS
- REST API
- JSON payloads

Backend → Database:
- SQL queries via PostgreSQL driver

Direct access from the frontend to the database is not allowed.

---

## Containerization

The application components are designed to run in Docker containers.

Each service may have its own container:

- Frontend container
- Backend container
- Database container

Docker ensures a consistent development environment across different machines.

---

## Local Deployment

During development, the system is expected to run locally using Docker.

Typical setup:

- Frontend served locally
- Backend API running locally
- PostgreSQL container

Detailed deployment instructions are provided in the INSTALL documentation.

---

## Future Kubernetes Deployment

Kubernetes may be used later to orchestrate containers.

Potential benefits:

- Scalability
- Automated deployment
- Fault tolerance
- Service management

This is currently considered a future improvement.

---

## Security Considerations (Future)

Security mechanisms may include:

- Authentication and authorization
- Secure communication (HTTPS)
- Input validation
- Protection against common web vulnerabilities

Security requirements will be refined during development.

---

## Summary

The architecture follows a modular and layered approach:

- Presentation layer: React frontend
- Application layer: Quarkus backend
- Data layer: PostgreSQL database

This separation improves maintainability, scalability, and testability of the system.
