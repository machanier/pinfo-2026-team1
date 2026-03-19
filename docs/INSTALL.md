# Development Environment Setup

This guide explains how to configure your machine to work on the **UNIGEvents** project.

It applies to **macOS, Linux, and Windows (WSL2 recommended)**.

---

## Option A — Dev Container (recommended)

The fastest way to get started. VS Code automatically builds a Docker image with everything included: **Java 17, Maven, Node 20, and a PostgreSQL database**.

No need to install Java or Node locally.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/) with the **Dev Containers** extension (`ms-vscode-remote.remote-containers`)

### Steps

1. Clone the repository and open it in VS Code:

```bash
git clone git@github.com:machanier/pinfo-2026-team1.git
cd pinfo-2026-team1
code .
```

2. VS Code detects `.devcontainer/devcontainer.json` and shows a notification:

> **"Reopen in Container"** — click it.

Or open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
`Dev Containers: Reopen in Container`

3. Wait for the image to build (first time only, ~2–5 minutes).

VS Code opens inside the container with all extensions installed and `npm install` already run.

### Start developing

Run the full stack with `Cmd+Shift+B` (or `Ctrl+Shift+B`) — this triggers the **"Start All"** task:

| Task | Command run internally | URL |
|------|------------------------|-----|
| Backend (Quarkus dev mode) | `./mvnw quarkus:dev` | http://localhost:8080 |
| Frontend (Vite dev server) | `npm run dev` | http://localhost:5173 |
| Swagger UI | — | http://localhost:8080/swagger-ui |

You can also run them individually via `Terminal > Run Task...`.

> The database (PostgreSQL) starts automatically with the container.
> `DB_HOST` is pre-configured to point to the internal `db` service — no `.env` file needed.

---

## Option B — Manual Setup

Use this if you prefer to develop without Docker, or if you need to run services directly on your machine.

---

## 1. Required Tools

The following tools must be installed before working on the project.

### Git

Git is required to clone the repository and contribute to the project.

Download:  
https://git-scm.com/downloads

Check installation:

```bash
git --version
```

### Docker

Docker is used to run services in containers.

Download:  
https://www.docker.com/products/docker-desktop/

After installation, verify that Docker works:

```bash
docker --version
```

#### Windows users

Docker Desktop requires WSL2.

Make sure the option  
“Use the WSL 2 based engine”  
is enabled in Docker settings.

### Java Development Kit (JDK)

The backend uses Java 17 with the Quarkus framework.

**Required version: JDK 17**

> Java 21 is also compatible. Avoid Java 25 or newer as it may cause build issues with the current Maven configuration.

Download JDK 17 (Temurin, recommended):  
https://adoptium.net/temurin/releases/?version=17

Check installation:

```bash
java -version
```

### Node.js

Node.js is required for frontend development (React).

Download:  
https://nodejs.org

Recommended version:  
Node LTS

Check installation:

```bash
node -v
npm -v
```

---

## 2. Recommended Tools

These tools are not mandatory but strongly recommended.

### GitKraken

GitKraken provides a graphical interface for Git and simplifies working with Git Flow.

Students can obtain GitKraken Pro for free via the GitHub Student Developer Pack.

Activation steps:

Verify your university email in GitHub  
Settings → Emails

Apply for the student pack  
https://education.github.com/students

Activate the GitKraken student plan  
https://www.gitkraken.com/github-student-developer-pack-bundle

### VS Code Extensions

Recommended extensions:

| Extension | Publisher | Purpose |
|-----------|-----------|---------|
| GitLens | GitKraken | Git history and blame in the editor |
| Container Tools | Microsoft | Dockerfile syntax, container management (replaces the old "Docker" extension) |
| GitHub Actions | GitHub | Validates and autocompletes `.github/workflows/*.yml` files |
| Extension Pack for Java | Microsoft | **Required for backend development** — Java syntax, Maven support, run/debug |
| ESLint | Microsoft | JavaScript/React code quality |
| Prettier | Prettier | Automatic code formatting |

> **Backend developers:** without the Java Extension Pack, Java files may appear with red underlines in VS Code even if the code compiles correctly. Install it and run `Java: Reload Projects` from the command palette (`Cmd+Shift+P`) after opening the project.

> **Note on the Java Extension Pack:** it requires the project's Maven dependencies to be downloaded at least once (`./mvnw dependency:resolve` in the `backend/` folder) before VS Code can fully resolve all imports.

### Postman

Postman can be used to test backend APIs.

Download:  
https://www.postman.com/downloads/

---

## 3. Clone the Repository

We use SSH authentication with GitHub.

Clone the repository:

```bash
git clone git@github.com:machanier/pinfo-2026-team1.git
```

Move into the project folder:

```bash
cd pinfo-2026-team1
```

Switch to the development branch:

```bash
git checkout develop
```

---

## 4. Project Structure

The project is organized into the following main components:

```
backend/   → Backend service (Java / Quarkus)
frontend/  → Frontend application (React)
docker/    → Container configuration
docs/      → Project documentation
```

Detailed setup instructions will be added as development progresses.

---

## 5. Kubernetes (Future)

Kubernetes support may be added later in the project.

The current development environment relies primarily on Docker.

---

## Troubleshooting

If you encounter issues during setup:

- verify installed versions of required tools
- ensure Docker is running
- verify SSH access to GitHub
