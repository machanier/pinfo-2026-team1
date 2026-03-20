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
