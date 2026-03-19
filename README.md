# UNIGEvents – PINFO 2026 (Team 1)

[![CI Pipeline](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/machanier/pinfo-2026-team1/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=alert_status)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=coverage)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=machanier_pinfo-2026-team1&metric=bugs)](https://sonarcloud.io/project/overview?id=machanier_pinfo-2026-team1)
![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)
![Quarkus](https://img.shields.io/badge/Quarkus-3.32.2-blue?logo=quarkus)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

Welcome to the official repository of **Team 1** for the **Software Engineering 2026** project at the **University of Geneva**.

**UNIGEvents** is a web application designed to simplify the discovery and management of university events at UNIGE.

---

## Project Overview

The goal of **UNIGEvents** is to develop a platform that allows students and university organizations to:

- discover events organized at the university
- consult event information such as date, location, and description
- manage and publish new events
- improve access to information about university life

---

## Team

| Role | Name | GitHub |
|------|------|--------|
| Project Lead | Thérèse Arousell | @tharsll |
| Frontend Developer | Gabin Prunet | @LeGabs |
| Backend Developers | Iris Riedo / Mathéo Gobillot | @iriried / @MGobillot3 |
| DevOps | Maxence Chanier | @machanier |

---

## Tech Stack

#### Frontend
- JavaScript
- Framework: React

#### Backend
- Java
- Framework: Quarkus

#### Database
- PostgreSQL

#### Infrastructure
- Docker
- Kubernetes (K8s)

#### DevOps & Tools
- GitHub
- GitHub Actions (CI)
- SonarCloud
- Postman
- Prometheus
- Jira
- GitKraken / GitLens

---

## Repository Structure

backend/   → Backend service
frontend/  → Frontend application
docker/    → Docker configuration
docs/      → Project documentation


Additional documentation is available in the **docs folder**.

---

## Development Workflow

This project follows the **Git Flow** methodology.

Main branches:

- **main**
  - stable version
  - production-ready code

- **develop**
  - main integration branch
  - default branch of the repository

Feature development:

feature/PINFO-XX-short-description


### Pull Requests

- Pull Requests are required for merging into `develop`
- At least **one approval** is required
- Direct pushes to protected branches are not allowed

---

## Getting Started

To setup the development environment, please follow the installation guide:

→ **[Installation Guide](./docs/INSTALL.md)**

---

## Project Status

Current progress:

- repository structure and Git Flow workflow in place
- CI pipeline (GitHub Actions) with backend tests and frontend build
- SonarCloud static analysis and JaCoCo coverage
- Dev Container for one-click development environment
- Docker Compose for local deployment
- Backend REST API with CRUD endpoints for events
- Jira integration (project key: PINFO)

---

## Academic Context

This project is developed in the context of the **Software Engineering course at the University of Geneva**.
