# Contributing Guidelines

This document describes the workflow and rules for contributing to the **UNIGEvents** project.

All contributors are expected to follow these guidelines to ensure code quality and project consistency.

---

## Development Workflow

The project follows the **Git Flow** methodology.

### Main branches

- `main`  
  Stable branch containing production-ready code

- `develop`  
  Main integration branch (default branch)

---

## Backend Microservice Scope

The backend is split into six modules under [backend](../backend):

- `user-service` (`:8081`)
- `event-service` (`:8082`)
- `registration-service` (`:8083`)
- `notification-service` (`:8084`)
- `search-service` (`:8085`)
- `moderation-service` (`:8086`)

Each service owns its own PostgreSQL database and should evolve independently whenever possible.

When implementing backend changes:

- limit PR changes to the service(s) affected by the Jira ticket
- avoid cross-service refactors unless explicitly required
- update docs if ports, endpoints, or run commands change

Quick command reference:

| Service | Maven module | Run command |
|--------|---------------|-------------|
| User | `user-service` | `./mvnw -pl user-service quarkus:dev` |
| Event | `event-service` | `./mvnw -pl event-service quarkus:dev` |
| Registration | `registration-service` | `./mvnw -pl registration-service quarkus:dev` |
| Notification | `notification-service` | `./mvnw -pl notification-service quarkus:dev` |
| Search | `search-service` | `./mvnw -pl search-service quarkus:dev` |
| Moderation | `moderation-service` | `./mvnw -pl moderation-service quarkus:dev` |

---

## Feature Development

New features must be developed in dedicated branches created from `develop`.

When Jira is used, each feature branch must correspond to a Jira issue.

Naming convention:

```
feature/PINFO-ID-short-description
```

Example:

```
feature/PINFO-12-event-search
```

Where:

- `PINFO-12` is the Jira issue ID (project key: `PINFO` on unige-groupe-1.atlassian.net)
- `short-description` briefly describes the feature

---

## Bug Fixes

Bug fixes should use:

```
bugfix/short-description
```

Example:

```
bugfix/event-date-display
```

---

## Pull Requests

Before merging into `develop`, a Pull Request (PR) is required.

Requirements:

- PR must target the `develop` branch
- At least one approval from another team member
- All automated checks must pass
- Resolve conflicts before merging

For backend PRs:

- mention impacted module(s) explicitly in the PR description
- mention whether database schema changes are included
- include API/doc updates when endpoint behavior changes

Direct pushes to protected branches are not allowed.

---

## Commit Messages

Write clear and descriptive commit messages.

Recommended format:

```
type: short description
```

Examples:

```
feat: add event search functionality
fix: correct date formatting bug
docs: update installation guide
```

---

## Jira Integration

Each development task should be linked to a Jira issue.

> The project lead is responsible for setting up the Jira ↔ GitHub integration.  
> Once configured, GitHub branches and commits will be automatically linked to Jira tickets.

Guidelines:

- Create one branch per Jira ticket
- Include the Jira issue ID in the branch name (e.g., `PINFO-12`)
- Reference the Jira ID in commit messages
- Link the Pull Request to the corresponding Jira ticket

Example commit message:

```
feat(PINFO-12): implement event search functionality
```

---

## Code Quality

- Follow project coding conventions
- Write readable and maintainable code
- Remove unused code
- Add comments when necessary

Backend-specific:

- keep module boundaries clear (no accidental coupling between services)
- keep configuration changes local to the relevant service unless shared by design

---

## Secret scanning (PINFO-198)

Every clone of the repo is expected to install the local pre-commit
hook before pushing — it stops a credential from ever reaching a
remote branch. The script under [`scripts/secret-scan.sh`](../scripts/secret-scan.sh)
runs in two tiers: `gitleaks` if installed (standard ruleset), then a
ripgrep/grep fallback that catches the placeholder-style tokens
gitleaks's defaults miss (e.g. `internal.service.key=...`,
`*-secret-here`, JDBC URLs with embedded passwords).

### One-time setup per clone

```bash
# From the repo root
./scripts/secret-scan.sh --install-hook
```

This symlinks `scripts/secret-scan.sh` to `.git/hooks/pre-commit` so
every `git commit` runs the scanner against staged files. The hook
exits non-zero on any finding — fix the leak (or move the value to a
Secret / `.env` / Kubernetes Secret) before re-staging.

### Other modes

```bash
./scripts/secret-scan.sh                # working tree (default)
./scripts/secret-scan.sh --pre-commit   # staged-only (what the hook runs)
./scripts/secret-scan.sh --all          # full git history (use before adding a new credential type)
```

Findings print the file and line but **never the matched value**, so
the script's own output is safe to paste in a chat or PR comment.

### Bypassing the hook

`git commit --no-verify` skips the hook. **Never push** a `--no-verify`
commit without flagging it on the PR — CI does not currently re-run
the scan, so a bypassed hook is the last line of defense.

---

## Communication

Coordinate major changes with the team before implementation.

Use project management tools (e.g., Jira) when available.

---

## Questions or Issues

If you are unsure about a change:

- ask the team before implementing
- open a discussion
- document decisions when relevant
