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
| `build-backend`  | Compiles the Quarkus backend (Java 21) and runs unit tests                       |
| `build-frontend` | Installs dependencies, lints and builds the React/Vite frontend                  |
| `sonarcloud`     | Runs after `build-backend` — generates coverage and sends analysis to SonarCloud |

> CI workflows are defined in `.github/workflows/ci.yml`.

### Pipeline flow

```
git push / PR opened
        │
        ▼
  build-backend (all backend modules)
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

Current backend commands used in CI are:

- `mvn --batch-mode clean test` in [backend](../backend)
- `mvn --batch-mode clean compile -DskipTests` before SonarCloud analysis

### What it checks

- **Bugs** — code likely to produce incorrect behaviour
- **Vulnerabilities** — security issues
- **Code smells** — maintainability problems
- **Coverage** — percentage of code covered by unit tests (via JaCoCo)
- **Duplications** — repeated code blocks

Coverage visibility depends on generated reports available during CI runs.

### Setup (one-time, manual)

1. Go to [sonarcloud.io](https://sonarcloud.io) and sign in with your GitHub account
2. Create an organisation linked to `machanier` (or the team organisation)
3. Import the `pinfo-2026-team1` repository
4. Copy the generated **SONAR_TOKEN**
5. In GitHub → Settings → Secrets → Actions → add secret `SONAR_TOKEN`

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

---

## Continuous Delivery (CD)

The project uses a **CD pipeline** (`.github/workflows/cd.yml`) that builds and publishes Docker images automatically.

### Trigger

The CD pipeline runs **only on push to `develop`** (i.e. when a PR is merged).

> It does **not** run on PRs — that's the CI's job. CD only kicks in after code is validated and merged.

### CD Jobs

| Job                    | What it does                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `build-backend-image`  | Builds the Quarkus backend JAR, packages it into a Docker image, pushes to ghcr.io        |
| `build-frontend-image` | Builds the React/Vite frontend, packages it into an Nginx Docker image, pushes to ghcr.io |

Both jobs run **in parallel** for speed.

### Pipeline flow

```
PR merged into develop
        │
        ├──► build-backend-image
        │      mvn package → docker build → push ghcr.io/.../backend:latest
        │
        └──► build-frontend-image
               npm ci → npm run build → docker build → push ghcr.io/.../frontend:latest
```

### Image tags

Each push produces two tags per image:

| Tag      | Example                       | Purpose                              |
| -------- | ----------------------------- | ------------------------------------ |
| `latest` | `ghcr.io/.../backend:latest`  | Always points to the newest build    |
| `<sha>`  | `ghcr.io/.../backend:a1b2c3d` | Immutable, tied to a specific commit |

### Container Registry

Images are stored on **GitHub Container Registry** (ghcr.io). They are visible in the repository's **Packages** tab.

No external account or token is needed — the pipeline uses the built-in `GITHUB_TOKEN`.

### Pulling images

```bash
docker pull ghcr.io/machanier/pinfo-2026-team1/backend:latest
docker pull ghcr.io/machanier/pinfo-2026-team1/frontend:latest
```

See the [Deployment Guide](DEPLOYMENT.md) for running the full stack with Docker Compose.
