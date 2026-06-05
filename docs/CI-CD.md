# CI/CD Pipeline

This document describes the Continuous Integration and Continuous Delivery pipelines used in the **UNIGEvents** project.

For the development workflow (branching, PRs, commit messages), see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Continuous Integration (CI)

The project uses **GitHub Actions**. CI is defined in `.github/workflows/ci.yml`.

### Triggers

- Push to `develop`
- Pull requests targeting `develop`

### CI Jobs

| Job                   | What it does                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `secret-scan`         | Scans the whole repository for committed secrets with **gitleaks**; fails the pipeline on any match                                          |
| `changes`             | Path filter (`dorny/paths-filter`) so the backend/frontend jobs skip when their part of the tree is untouched                                |
| `build-backend`       | Builds the Quarkus backend (Java 21) and runs the full test suite against a PostgreSQL service container (`mvn clean verify`); uploads the JaCoCo coverage report |
| `build-frontend`      | Installs dependencies (`npm ci`), lints, and builds the React/Vite frontend                                                                   |
| `sonarcloud-backend`  | Analyses the backend on SonarCloud (project `machanier_pinfo-2026-team1`) using the JaCoCo coverage from `build-backend`                      |
| `sonarcloud-frontend` | Runs Vitest with coverage and analyses the frontend on SonarCloud (project `unigEvents-frontend`); retries once on a transient scanner 403   |
| `ci-passed`           | Aggregator that passes only if every upstream job passed or was legitimately skipped — the single required status check on `develop`         |

> Backend and frontend are split on purpose: a frontend-only PR doesn't rebuild the Quarkus tree, and vice versa. On a `develop` push the SonarCloud jobs are non-blocking — the merged commit already passed the gate on its PR, so a post-merge flake never reds `develop`.

### Pipeline flow

```
git push / PR opened
        │
        ├──► secret-scan (gitleaks)
        │
        ├──► build-backend ──► sonarcloud-backend    (project: machanier_pinfo-2026-team1)
        │
        └──► build-frontend ─► sonarcloud-frontend   (project: unigEvents-frontend)
                                        │
                                        ▼
                                   ci-passed  (required status check)
```

---

## SonarCloud — Static Code Analysis

[SonarCloud](https://sonarcloud.io) analyses **two separate projects** on every push and pull request:

| Code base                | SonarCloud project key       | Coverage source        |
| ------------------------ | ---------------------------- | ---------------------- |
| Backend (Java / Quarkus) | `machanier_pinfo-2026-team1` | JaCoCo (`mvn verify`)  |
| Frontend (React / Vite)  | `unigEvents-frontend`        | Vitest LCOV            |

Both live under the `machanier` SonarCloud organisation.

### What it checks

- **Bugs** — code likely to produce incorrect behaviour
- **Vulnerabilities** — security issues
- **Code smells** — maintainability problems
- **Coverage** — percentage of code covered by tests (JaCoCo for the backend, Vitest for the frontend)
- **Duplications** — repeated code blocks

A pull request must pass each project's **quality gate** (which scores the *new* code) before it can merge.

### Setup (one-time, manual)

1. Sign in to [sonarcloud.io](https://sonarcloud.io) with GitHub
2. Under the `machanier` organisation, import the two projects (`machanier_pinfo-2026-team1` and `unigEvents-frontend`)
3. Add the generated **SONAR_TOKEN** under GitHub → Settings → Secrets → Actions

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

---

## Continuous Delivery (CD)

CD is defined in `.github/workflows/cd.yml`. It builds, scans, publishes, **and deploys** automatically.

### Trigger

Runs **only on push to `develop`** (i.e. when a PR is merged). It does not run on PRs — that's CI's job.

### CD Jobs

| Job                    | What it does                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-backend-images` | **Matrix of 6 jobs** (one per service): builds each Quarkus service image, scans it with **Trivy** (fails on `CRITICAL`, honouring `.trivyignore`), pushes to ghcr.io |
| `build-frontend-image` | Builds the React/Vite frontend into an Nginx image, scans it with Trivy, pushes to ghcr.io                                                                        |
| `deploy-to-microk8s`   | Runs on the **self-hosted `pinfo1` runner**: `kubectl apply -f k8s/ -R`, then `kubectl set image` pins every Deployment to the new commit-SHA tag; restarts Kong only if its config changed; runs a smoke test |

### Image tags

Each push produces two tags per image:

| Tag      | Example                              | Purpose                                                          |
| -------- | ------------------------------------ | --------------------------------------------------------------- |
| `latest` | `ghcr.io/.../user-service:latest`    | Always points to the newest build                               |
| `<sha>`  | `ghcr.io/.../user-service:a1b2c3d`   | Immutable; the deploy pins Deployments to this so rollbacks are deterministic |

### Pipeline flow

```
PR merged into develop
        │
        ├──► build-backend-images  (6× matrix: build → Trivy → push ghcr.io)
        │
        ├──► build-frontend-image  (build → Trivy → push ghcr.io)
        │
        └──► deploy-to-microk8s    (self-hosted pinfo1 runner)
               kubectl apply -f k8s/ -R
               kubectl set image … :<sha>
               restart Kong if its config changed → smoke test
```

### Container Registry

Images are stored on **GitHub Container Registry** (ghcr.io), visible under the repository's **Packages** tab. The pipeline authenticates with the built-in `GITHUB_TOKEN`.

### Pulling images

```bash
docker pull ghcr.io/machanier/pinfo-2026-team1/user-service:latest
docker pull ghcr.io/machanier/pinfo-2026-team1/frontend:latest
# one image per backend service: user-service, event-service, registration-service,
# notification-service, moderation-service, search-service
```

---

## Scheduled workflows

| Workflow                  | Schedule         | Purpose                                                                                                        |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `trivy-scheduled.yml`     | Scheduled / manual | Re-scans the published images for newly-disclosed CVEs so the team is notified when a previously-clean image drifts |
| `auth0-jwks-rotation.yml` | Daily            | Detects Auth0 signing-key rotations and opens a PR to update Kong's pinned public key (PINFO-200)              |

See the [Deployment Guide](DEPLOYMENT.md) for running the stack and the production rollout / rollback details.
