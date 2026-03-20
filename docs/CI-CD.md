# CI/CD Pipeline

This document describes the Continuous Integration pipeline used in the **UNIGEvents** project.

For the development workflow (branching, PRs, commit messages), see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Continuous Integration (CI)

The project uses **GitHub Actions** for automation.

### Triggers

CI pipelines are triggered on:

- Push to `develop`
- Pull Requests targeting `develop`

### CI Jobs

| Job              | What it does                                                                     |
| ---------------- | -------------------------------------------------------------------------------- |
| `build-backend`  | Compiles the Quarkus backend (Java 17) and runs unit tests                       |
| `build-frontend` | Installs dependencies, lints and builds the React/Vite frontend                  |
| `sonarcloud`     | Runs after `build-backend` — generates coverage and sends analysis to SonarCloud |

> CI workflows are defined in `.github/workflows/ci.yml`.

### Pipeline flow

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

---

## SonarCloud — Static Code Analysis

[SonarCloud](https://sonarcloud.io) performs automatic analysis of the backend code on every push and pull request.

### What it checks

- **Bugs** — code likely to produce incorrect behaviour
- **Vulnerabilities** — security issues
- **Code smells** — maintainability problems
- **Coverage** — percentage of code covered by unit tests (via JaCoCo)
- **Duplications** — repeated code blocks

### Setup (one-time, manual)

1. Go to [sonarcloud.io](https://sonarcloud.io) and sign in with your GitHub account
2. Create an organisation linked to `machanier` (or the team organisation)
3. Import the `pinfo-2026-team1` repository
4. Copy the generated **SONAR_TOKEN**
5. In GitHub → Settings → Secrets → Actions → add secret `SONAR_TOKEN`

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

---

## Continuous Delivery / Deployment (CD)

CD will be implemented in a later phase of the project. See the [Deployment Guide](DEPLOYMENT.md) for the current Docker Compose setup.
