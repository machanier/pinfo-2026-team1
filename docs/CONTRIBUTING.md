# Contributing Guidelines

How to contribute to **UNIGEvents**. The [README](../README.md) covers the high-level Git Flow and PR rules; this guide details the day-to-day conventions.

---

## Branching

Branch off `develop`, one branch per Jira ticket (project key `PINFO`):

| Type         | Pattern                              | Example                         |
| ------------ | ------------------------------------ | ------------------------------- |
| Feature      | `feature/PINFO-XX-short-description` | `feature/PINFO-12-event-search` |
| Bug fix      | `bugfix/PINFO-XX-short-description`  | `bugfix/PINFO-34-event-date`    |
| Chore / docs | `chore/short-description`            | `chore/trim-contributing`       |

---

## Commits

Tie each commit to its Jira ticket:

```
type(PINFO-XX): short description
```

`type` is one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. For untracked chores, use a scope instead of a ticket (e.g. `chore(docs): ...`).

```
feat(PINFO-12): add event search
fix(PINFO-34): correct event date formatting
```

---

## Pull Requests

- Target the `develop` branch — direct pushes to protected branches are blocked.
- At least **one approval** from another team member.
- All CI checks must pass; resolve conflicts before merging.
- **Backend PRs:** name the impacted service(s), flag any database schema change, and update API docs when endpoint behaviour changes.

---

## Secret scanning

A local pre-commit hook keeps credentials out of the remote. Install it once per clone:

```bash
./scripts/secret-scan.sh --install-hook
```

It runs `gitleaks` (if installed) plus a grep fallback for placeholder-style secrets. Other modes:

```bash
./scripts/secret-scan.sh              # working tree (default)
./scripts/secret-scan.sh --pre-commit # staged only (what the hook runs)
./scripts/secret-scan.sh --all        # full history
```

Findings show the file and line but **never the value**. `git commit --no-verify` skips the hook — never push a bypassed commit without flagging it on the PR.

---

## Good practices

- Keep a PR scoped to the service(s) of its ticket; avoid cross-service refactors unless required.
- Keep microservice boundaries clean — no accidental coupling between services.
- Update the docs when ports, endpoints, or run commands change.
- Setup and run commands live in **[INSTALL.md](./INSTALL.md)**.
- When in doubt, ask the team before implementing.
