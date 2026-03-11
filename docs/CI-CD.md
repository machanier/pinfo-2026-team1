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

### Current CI steps

- [ ] Build verification (backend + frontend)
- [ ] Automated tests
- [ ] Code quality checks (SonarQube)

> CI workflows are defined under `.github/workflows/` (`ci.yml`).

---

## CI Objectives

- Detect integration issues early
- Ensure the project compiles and builds successfully
- Maintain code quality standards
- Prevent broken code from being merged into `develop`

---

## Planned Enhancements

- Unit and integration testing
- Code coverage reports
- Static code analysis with SonarQube
- Security vulnerability scanning

---

## Continuous Delivery / Deployment (CD)

CD will be implemented in a later phase of the project.

Possible targets:

- Local deployment via Docker Compose
- Container-based deployment
- Kubernetes environments

---

## Development Workflow

1. Developer creates a branch from `develop` (`feature/UNI-XX-...`)
2. Pull Request is opened targeting `develop`
3. CI pipeline runs automatically
4. Code review is performed (minimum 1 approval required)
5. Changes are merged into `develop` if all checks pass

---

## Tools

| Tool           | Role                                 |
|----------------|--------------------------------------|
| GitHub Actions | CI/CD automation                     |
| Docker         | Containerization                     |
| SonarQube      | Static analysis (planned)            |
| Kubernetes     | Container orchestration (future)     |
| Jira           | Issue tracking and task management   |

---

## Jira Integration

Project tasks are managed in Jira.

> The project lead is responsible for configuring the Jira ↔ GitHub integration.  
> Once set up, Jira tickets will be automatically linked to branches, commits, and Pull Requests.

Each feature branch should reference its corresponding Jira ticket ID (e.g., `feature/UNI-12-event-search`).