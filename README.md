<div align="center">

# UNIGEvents

**Discover, publish, and manage university events at UNIGE — in one click.**

[![Live site](https://img.shields.io/badge/live-pinfo1.p--info.net-E6007E?logo=cloudflare&logoColor=white)](https://pinfo1.p-info.net)
[![CI Pipeline](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=alert_status)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=coverage)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)

![Java 21](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)
![Quarkus 3.35](https://img.shields.io/badge/Quarkus-3.35-4695EB?logo=quarkus&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-per--service-4169E1?logo=postgresql&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-microk8s-326CE5?logo=kubernetes&logoColor=white)

[**Live site**](https://pinfo1.p-info.net) &nbsp;·&nbsp; [**Documentation**](./docs) &nbsp;·&nbsp; [**Getting Started**](./docs/INSTALL.md)

</div>

---

Official repository of **Team 1** for the **Software Engineering 2026** course at the **University of Geneva**. UNIGEvents is a web application that helps students and university organizations discover, publish, and register for events across campus.

## Table of Contents

- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quality & Metrics](#quality--metrics)
- [Documentation](#documentation)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Team](#team)
- [Project Status](#project-status)
- [Academic Context](#academic-context)

## Live Demo

- **Application:** https://pinfo1.p-info.net
- **Health check:** https://pinfo1.p-info.net/q/health/ready

The site is deployed continuously from the `develop` branch to a microk8s cluster and exposed through a Cloudflare Tunnel. Sign in or create an account to browse and register for events.

## Features

- Browse upcoming events with date, location, capacity, and description
- Register for an event in one click
- Publish and manage events as an organizer
- Search and filter across all events
- Moderation workflow for published content
- Notifications for registrations and updates

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite, JavaScript |
| **Backend** | Java 21, Quarkus 3.35 — 6 microservices |
| **Database** | PostgreSQL (one database per service) |
| **API Gateway** | Kong |
| **Authentication** | Auth0 (JWT with roles claim) |
| **Infrastructure** | Docker, Kubernetes (microk8s), Cloudflare Tunnel |
| **CI/CD & Quality** | GitHub Actions, SonarCloud, JaCoCo, Trivy |
| **Secrets** | Doppler |
| **Observability** | Prometheus |
| **Tooling** | Postman, Jira, GitKraken / GitLens |

## Architecture

UNIGEvents follows a microservices architecture. The backend is split into six independent Quarkus services, each with its own PostgreSQL database, fronted by a Kong API gateway and secured with Auth0.

| Service | Responsibility |
| --- | --- |
| **User** | Accounts, profiles, and roles |
| **Event** | Event creation and lifecycle |
| **Registration** | Event sign-ups and capacity |
| **Notification** | User notifications |
| **Search** | Event search and filtering |
| **Moderation** | Review and approval of content |

→ Full design in **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

## Quality & Metrics

Every pull request runs the CI pipeline (tests + static analysis); every push to `develop` is scanned, built, and deployed. Code quality is tracked publicly on SonarCloud.

| Aspect | Tool | Status |
| --- | --- | --- |
| Build & tests | GitHub Actions | [![CI Pipeline](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml) |
| Quality gate | SonarCloud | [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=alert_status)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1) |
| Coverage | SonarCloud · JaCoCo | [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=coverage)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=coverage) |
| Bugs | SonarCloud | [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=bugs)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=bugs) |
| Vulnerabilities | SonarCloud | [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=vulnerabilities)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=vulnerabilities) |
| Code smells | SonarCloud | [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=code_smells)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=code_smells) |
| Maintainability | SonarCloud | [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=sqale_rating)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1) |
| Container security | Trivy | Scanned on CI (gates on `CRITICAL`) |

→ Full dashboard on **[SonarCloud](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)** · pipeline details in **[docs/CI-CD.md](./docs/CI-CD.md)**

## Documentation

| Guide | Description |
| --- | --- |
| [INSTALL.md](./docs/INSTALL.md) | Set up the development environment and required tools |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | High-level system architecture and design decisions |
| [API.md](./docs/API.md) | REST API specification for the backend services |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment (Kubernetes, Cloudflare Tunnel) |
| [CI-CD.md](./docs/CI-CD.md) | Continuous integration and delivery pipeline |
| [AUTH0.md](./docs/AUTH0.md) | Auth0 tenant configuration and JWT / roles setup |
| [DOPPLER.md](./docs/DOPPLER.md) | Secret management with Doppler |
| [MIGRATIONS.md](./docs/MIGRATIONS.md) | Database migration strategy |
| [INCIDENTS.md](./docs/INCIDENTS.md) | Production incident response runbook |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Git Flow conventions, branches, commits, Jira |

## Repository Structure

```
.
├── backend/    Backend microservices (Java / Quarkus)
├── frontend/   Frontend application (React / Vite)
├── docker/     Docker Compose configuration
├── k8s/        Kubernetes manifests (production)
├── docs/       Project documentation
└── scripts/    Utility scripts
```

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/machanier/pinfo-2026-team1.git
cd pinfo-2026-team1

# 2. Follow the installation guide for the full setup
#    (databases, backend services, frontend)
```

Complete instructions are in **[docs/INSTALL.md](./docs/INSTALL.md)**.

## Development Workflow

This project follows the **Git Flow** methodology.

| Branch | Purpose |
| --- | --- |
| `main` | Stable, production-ready code |
| `develop` | Main integration branch (default) — auto-deployed |
| `feature/PINFO-XX-*` | Feature development |
| `bugfix/PINFO-XX-*` | Bug fixes |

**Pull requests**

- Required for merging into `develop`
- At least **one approval** is required
- Direct pushes to protected branches are not allowed

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** for commit conventions and Jira integration.

## Team

| Role | Name | GitHub |
| --- | --- | --- |
| Project Lead | Thérèse Arousell | [@tharsll](https://github.com/tharsll) |
| Frontend Developer | Gabin Prunet | [@LeGabs](https://github.com/LeGabs) |
| Backend Developer | Iris Riedo | [@iriried](https://github.com/iriried) |
| Backend Developer | Mathéo Gobillot | [@MGobillot3](https://github.com/MGobillot3) |
| DevOps | Maxence Chanier | [@machanier](https://github.com/machanier) |

## Project Status

- Six backend microservices: User, Event, Registration, Notification, Search, Moderation
- CI pipeline (GitHub Actions): backend tests, frontend build, SonarCloud analysis, Trivy scanning
- Continuous deployment to microk8s on every push to `develop`
- Live in production behind a Cloudflare Tunnel at **[pinfo1.p-info.net](https://pinfo1.p-info.net)**
- JaCoCo coverage and SonarCloud quality gate enforced on every PR
- Secrets managed with Doppler; Prometheus monitoring in place
- Dev Container for a one-click development environment

## Academic Context

Developed for the **Software Engineering** course at the **University of Geneva** (2025–2026).
