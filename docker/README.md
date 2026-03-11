# Docker

This folder contains the Docker configuration for the **UNIGEvents** application.

Docker is used to containerize the different components of the project and ensure reproducibility across environments.

---

## Architecture

Each component runs in its own container:

| Container     | Description                    |
|---------------|-------------------------------|
| `frontend`    | React application              |
| `backend`     | Java / Quarkus API service     |
| `db`          | PostgreSQL database            |

---

## Files

> Docker configuration files (Dockerfiles, docker-compose.yml) will be added here as development progresses.

---

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Docker.

Refer to the [Deployment Guide](../docs/DEPLOYMENT.md) for instructions on running the application with Docker.
