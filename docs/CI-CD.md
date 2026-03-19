# CI/CD Pipeline

This document describes the Continuous Integration and Continuous Delivery approach used in the **UNIGEvents** project.

---

## Continuous Integration (CI)

CI ensures that code changes are automatically tested and validated before being merged.

The project uses **GitHub Actions** for automation.

### Triggers

CI pipelines are triggered on:

- Push to `develop`
- Pull Requests targeting `develop`

### CI Jobs

| Job | What it does |
|-----|-------------|
| `build-backend` | Compiles the Quarkus backend (Java 17) and runs unit tests |
| `build-frontend` | Installs dependencies, lints and builds the React/Vite frontend |
| `sonarcloud` | Runs after `build-backend` — generates coverage and sends analysis to SonarCloud |

> CI workflows are defined under `.github/workflows/ci.yml`.

---

## SonarCloud — Static Code Analysis

[SonarCloud](https://sonarcloud.io) performs automatic analysis of the backend code on every push and pull request.

### What it checks

- **Bugs** — code likely to produce incorrect behaviour
- **Vulnerabilities** — security issues
- **Code smells** — maintainability problems
- **Coverage** — percentage of code covered by unit tests (via JaCoCo)
- **Duplications** — repeated code blocks

### How it works

```
git push / PR opened
        │
        ▼
  build-backend (tests + JaCoCo report)
        │
        ▼
  sonarcloud job
        │  mvn sonar:sonar
        ▼
  sonarcloud.io dashboard
  (results visible on the PR and at sonarcloud.io)
```

### Setup (one-time, manual)

1. Go to [sonarcloud.io](https://sonarcloud.io) and sign in with your GitHub account
2. Create an organisation linked to `machanier` (or the team organisation)
3. Import the `pinfo-2026-team1` repository
4. Copy the generated **SONAR_TOKEN**
5. In GitHub → Settings → Secrets → Actions → add secret `SONAR_TOKEN`

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

---

## CI Objectives

- Detect integration issues early
- Ensure the project compiles and builds successfully
- Maintain code quality standards (SonarCloud Quality Gate)
- Prevent broken or low-quality code from being merged into `develop`

---

## Continuous Delivery / Deployment (CD)

CD will be implemented in a later phase of the project.

Possible targets:

- Local deployment via Docker Compose ✅ (already in place)
- Container-based deployment
- Kubernetes environments

---

## Development Workflow

1. Developer creates a branch from `develop` (`feature/PINFO-XX-...`)
2. Pull Request is opened targeting `develop`
3. CI pipeline runs automatically (build + tests + SonarCloud)
4. Code review is performed (minimum 1 approval required)
5. Changes are merged into `develop` if all checks pass

---

## Tools

| Tool           | Role                                          |
|----------------|-----------------------------------------------|
| GitHub Actions | CI/CD automation                              |
| JaCoCo         | Java code coverage report (feeds SonarCloud)  |
| SonarCloud     | Static analysis, quality gate, coverage       |
| Docker         | Containerisation                              |
| Kubernetes     | Container orchestration (future)              |
| Jira           | Issue tracking and task management            |

---

## Jira Integration

Project tasks are managed in Jira.

> The project lead is responsible for configuring the Jira ↔ GitHub integration.  
> Once set up, Jira tickets will be automatically linked to branches, commits, and Pull Requests.

Each feature branch should reference its corresponding Jira ticket ID (e.g., `feature/PINFO-12-event-search`).
