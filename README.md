# UNIGEvents

Welcome to the official repository of **Team 1** for the **Software Engineering 2026** project at the **University of Geneva**.

**UNIGEvents** is a web application designed to simplify the discovery and management of university events at UNIGE.

[![Live site](https://img.shields.io/badge/live-pinfo1.p--info.net-E6007E?logo=cloudflare&logoColor=white)](https://pinfo1.p-info.net)
[![CI Pipeline](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml)

<p align="center">
  <img src="./docs/images/unige.png" alt="Université de Genève" width="500" />
</p>

<p align="center">
  <img src="./docs/images/unige-sciences.png" alt="Faculté des Sciences" width="200" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./docs/images/unige-cui.png" alt="Centre Universitaire d'Informatique" width="200" />
</p>

---

UNIGEvents centralizes campus life in one place: students browse and register for events, while organizations publish, moderate, and manage them. The application is deployed continuously from the `develop` branch to a microk8s cluster behind a Cloudflare Tunnel, and is live at **[pinfo1.p-info.net](https://pinfo1.p-info.net)** — sign in or create an account to browse and register for events.

## Quality & Metrics

Both code bases are analysed by **SonarCloud** on every pull request. The backend and the frontend are tracked as **two separate projects**, each with its own quality gate and coverage — the table below reports them side by side.

| Metric              | Backend — Java / Quarkus                                                                                                                                                                                                                              | Frontend — React / Vite                                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quality Gate**    | [![Backend Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=alert_status)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)                                             | [![Frontend Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=alert_status)](https://sonarcloud.io/project/overview?id=unigEvents-frontend)                                       |
| **Coverage**        | [![Backend Coverage](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=coverage)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=coverage)                                  | [![Frontend Coverage](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=coverage)](https://sonarcloud.io/component_measures?id=unigEvents-frontend&metric=coverage)                             |
| **Bugs**            | [![Backend Bugs](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=bugs)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=bugs)                                              | [![Frontend Bugs](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=bugs)](https://sonarcloud.io/component_measures?id=unigEvents-frontend&metric=bugs)                                         |
| **Vulnerabilities** | [![Backend Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=vulnerabilities)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=vulnerabilities)             | [![Frontend Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=vulnerabilities)](https://sonarcloud.io/component_measures?id=unigEvents-frontend&metric=vulnerabilities)       |
| **Code Smells**     | [![Backend Code Smells](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=code_smells)](https://sonarcloud.io/component_measures?id=machanier_pinfo-2026-team1&metric=code_smells)                         | [![Frontend Code Smells](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=code_smells)](https://sonarcloud.io/component_measures?id=unigEvents-frontend&metric=code_smells)                    |
| **Maintainability** | [![Backend Maintainability](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=sqale_rating)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)                                         | [![Frontend Maintainability](https://sonarcloud.io/api/project_badges/measure?project=unigEvents-frontend&metric=sqale_rating)](https://sonarcloud.io/project/overview?id=unigEvents-frontend)                                    |

Beyond SonarCloud, two repository-wide gates run in CI: container images are scanned with **Trivy** (the build fails on a `CRITICAL` finding) and **gitleaks** blocks any accidentally-committed secret before it reaches `develop`.

→ Dashboards: **[SonarCloud · Backend](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)** · **[SonarCloud · Frontend](https://sonarcloud.io/project/overview?id=unigEvents-frontend)** · pipeline details in **[docs/CI-CD.md](./docs/CI-CD.md)**

## Features

UNIGEvents serves three kinds of users, all authenticated through **Auth0** with role-based access (`STUDENT`, `ORGANIZER`, `ADMIN`); public browsing works without an account.

- **🎓 Students** — browse and **search** events (full-text + filters: category, faculty, date, place, availability), view details and **register** (with automatic **waitlist** when full), keep a personal **favorites** list and **calendar**, and receive **in-app + email notifications** (registration confirmed, waitlist freed, event updates/cancellations, announcements, reminders) with per-type **preferences**.
- **🧑‍💼 Organizers** — create, edit, and cancel events with **banner upload**, post **announcements**, submit content for moderation, and track each event's **registrations and stats** from a public organizer profile.
- **🛡️ Administrators** — work through the **moderation queue** to approve or reject events and announcements; incoming content is **auto-screened by AI** (OpenAI) before it reaches a human reviewer.

## Tech Stack

![Java 21](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)
![Quarkus 3.36](https://img.shields.io/badge/Quarkus-3.36-4695EB?logo=quarkus&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-per--service-4169E1?logo=postgresql&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-microk8s-326CE5?logo=kubernetes&logoColor=white)

| Layer               | Technologies                                     |
| ------------------- | ------------------------------------------------ |
| **Frontend**        | React 19, Vite, JavaScript                       |
| **Backend**         | Java 21, Quarkus 3.36 — 6 microservices          |
| **Database**        | PostgreSQL (one database per service)            |
| **Messaging**       | Apache Kafka (event-driven, KRaft)               |
| **API Gateway**     | Kong                                             |
| **Authentication**  | Auth0 (JWT with roles claim)                     |
| **Infrastructure**  | Docker, Kubernetes (microk8s), Cloudflare Tunnel |
| **CI/CD & Quality** | GitHub Actions, SonarCloud, JaCoCo, Trivy        |
| **Secrets**         | Doppler                                          |
| **Observability**   | Prometheus                                       |
| **Tooling**         | Postman, Jira                                    |

## Architecture

UNIGEvents follows a microservices architecture. The backend is split into six independent Quarkus services, each with its own PostgreSQL database, fronted by a Kong API gateway and secured with Auth0. Services communicate asynchronously over Apache Kafka.

| Service          | Responsibility                 |
| ---------------- | ------------------------------ |
| **User**         | Accounts, profiles, and roles  |
| **Event**        | Event creation and lifecycle   |
| **Registration** | Event sign-ups and capacity    |
| **Notification** | User notifications             |
| **Search**       | Event search and filtering     |
| **Moderation**   | Review and approval of content |

→ Full design in **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

## Documentation

| Guide                                     | Description                                                  |
| ----------------------------------------- | ------------------------------------------------------------ |
| [INSTALL.md](./docs/INSTALL.md)           | Set up the development environment and required tools        |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | High-level system architecture and design decisions          |
| [API.md](./docs/API.md)                   | REST API specification for the backend services              |
| [AUTH0.md](./docs/AUTH0.md)               | Auth0 tenant configuration and JWT / roles setup             |
| [DOPPLER.md](./docs/DOPPLER.md)           | Secret management with Doppler                               |
| [MIGRATIONS.md](./docs/MIGRATIONS.md)     | Database migration strategy                                  |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md)     | Production deployment (Kubernetes, Cloudflare Tunnel)        |
| [CI-CD.md](./docs/CI-CD.md)               | Continuous integration and delivery pipeline                 |
| [INCIDENTS.md](./docs/INCIDENTS.md)       | Production incident response runbook                         |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Git Flow conventions, branches, commits, and Jira integration |

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

Complete instructions are in **[docs/INSTALL.md](./docs/INSTALL.md)**. A preconfigured **Dev Container** is also available for a one-click environment.

## Development Workflow

This project follows the **Git Flow** methodology.

| Branch               | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `main`               | Stable, production-ready code                     |
| `develop`            | Main integration branch (default) — auto-deployed |
| `feature/PINFO-XX-*` | Feature development                               |
| `bugfix/PINFO-XX-*`  | Bug fixes                                          |

**Pull requests**

- Required for merging into `develop`
- At least **one approval** is required
- Direct pushes to protected branches are not allowed

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** for commit conventions and Jira integration.

## Team

| Role               | Name             | GitHub                                       |
| ------------------ | ---------------- | -------------------------------------------- |
| Project Lead       | Thérèse Arousell | [@tharsll](https://github.com/tharsll)       |
| Frontend Developer | Gabin Prunet     | [@LeGabs](https://github.com/LeGabs)         |
| Backend Developer  | Iris Riedo       | [@iriried](https://github.com/iriried)       |
| Backend Developer  | Mathéo Gobillot  | [@MGobillot3](https://github.com/MGobillot3) |
| DevOps             | Maxence Chanier  | [@machanier](https://github.com/machanier)   |

## Licence & Policies

This repository is coursework for the University of Geneva's **Software Engineering** course. It is **not** published under an open-source licence: © 2026 Team 1 — all rights reserved. Please don't reuse, copy, or redistribute the code without the team's permission.

Contribution conventions (branches, commits, reviews) are documented in **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)**.
