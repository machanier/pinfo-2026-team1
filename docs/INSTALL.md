# Development Environment Setup

This guide explains how to configure your machine to work on the **UNIGEvents** project.

It applies to **macOS, Linux, and Windows (WSL2 recommended)**.

---

## 1. Prerequisites

The following tools are required regardless of which setup option you choose.

### Git

Download: https://git-scm.com/downloads

```bash
git --version
```

### Docker Desktop

Docker is required for both options: the Dev Container runs inside Docker, and the manual setup uses it for the PostgreSQL database.

Download: https://www.docker.com/products/docker-desktop/

```bash
docker --version
```

**Windows users:** Docker Desktop requires WSL2. Make sure the option "Use the WSL 2 based engine" is enabled in Docker settings.

### VS Code

Download: https://code.visualstudio.com/

### Clone the Repository

We use SSH authentication with GitHub.

```bash
git clone git@github.com:machanier/pinfo-2026-team1.git
cd pinfo-2026-team1
git checkout develop
```

---

## 2. Choose Your Setup

### Option A — Dev Container (recommended)

The fastest way to get started. VS Code automatically builds a Docker image with everything included: **Java 21, Maven, Node 20, and a PostgreSQL database**.

No need to install Java or Node locally.

#### Additional prerequisite

Install the **Dev Containers** extension in VS Code (`ms-vscode-remote.remote-containers`).

#### Steps

1. Open the project in VS Code:

```bash
code .
```

2. VS Code detects `.devcontainer/devcontainer.json` and shows a notification:

> **"Reopen in Container"** — click it.

Or open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
`Dev Containers: Reopen in Container`

3. Wait for the image to build (first time only, ~2–5 minutes).

VS Code opens inside the container with all extensions installed, Maven dependencies resolved, and `npm install` already run.

#### Start developing

Run the full stack with `Cmd+Shift+B` (or `Ctrl+Shift+B`) — this triggers the **"Start All"** task:

| Task | Command run internally | URL |
|------|------------------------|-----|
| User Service | `./mvnw -pl user-service quarkus:dev` | http://localhost:8081 |
| Event Service | `./mvnw -pl event-service quarkus:dev` | http://localhost:8082 |
| Registration Service | `./mvnw -pl registration-service quarkus:dev` | http://localhost:8086 |
| Notification Service | `./mvnw -pl notification-service quarkus:dev` | http://localhost:8083 |
| Search Service | `./mvnw -pl search-service quarkus:dev` | http://localhost:8085 |
| Moderation Service | `./mvnw -pl moderation-service quarkus:dev` | http://localhost:8084 |
| Frontend (Vite dev server) | `npm run dev` | http://localhost:5173 |

You can also run them individually via `Terminal > Run Task...`.

Start the backend database stack before launching services:

```bash
docker compose -f docker/docker-compose.yml up -d
```

---

### Option B — Manual Setup

Use this if you prefer to develop without the Dev Container, or if you need to run services directly on your machine.

#### Additional prerequisites

On top of the common prerequisites above, you need:

**Java Development Kit (JDK 21)**

> JDK 21 is the required version. Avoid Java 25 or newer as it may cause build issues with the current Maven configuration.

Download JDK 21 (Temurin, recommended): https://adoptium.net/temurin/releases/?version=21

```bash
java -version
```

**Node.js (LTS)**

Download: https://nodejs.org

```bash
node -v
npm -v
```

#### Start developing

1. **Start the database** using Docker Compose:

```bash
docker compose -f docker/docker-compose.yml up -d
```

2. **Start backend services** in dev mode (one terminal per service):

```bash
cd backend
./mvnw -pl user-service quarkus:dev
./mvnw -pl event-service quarkus:dev
./mvnw -pl registration-service quarkus:dev
./mvnw -pl notification-service quarkus:dev
./mvnw -pl search-service quarkus:dev
./mvnw -pl moderation-service quarkus:dev
```

APIs are available on ports 8081-8086 (see [API.md](API.md)).

3. **Start the frontend** in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at http://localhost:5173.

---

## 3. Recommended Tools

These tools are not mandatory but strongly recommended, regardless of your setup option.

### GitKraken

GitKraken provides a graphical interface for Git and simplifies working with Git Flow.

Students can obtain GitKraken Pro for free via the GitHub Student Developer Pack.

Activation steps:

1. Verify your university email in GitHub → Settings → Emails
2. Apply for the student pack: https://education.github.com/students
3. Activate the GitKraken student plan: https://www.gitkraken.com/github-student-developer-pack-bundle

### VS Code Extensions

> If you use the Dev Container (Option A), these extensions are installed automatically.

Recommended extensions:

| Extension               | Publisher   | Purpose                                                          |
| ----------------------- | ----------- | ---------------------------------------------------------------- |
| Extension Pack for Java | Microsoft   | **Required for backend** — Java syntax, Maven support, run/debug |
| Quarkus                 | Red Hat     | Autocompletion for `application.properties`, Quarkus annotations |
| ESLint                  | Microsoft   | JavaScript/React code quality                                    |
| Prettier                | Prettier    | Automatic code formatting                                        |
| Container Tools         | Microsoft   | Dockerfile syntax, container management                          |
| GitLens                 | GitKraken   | Git history and blame in the editor                              |
| GitHub Actions          | GitHub      | Validates and autocompletes `.github/workflows/*.yml` files      |
| REST Client             | Huachao Mao | Test REST APIs directly from VS Code                             |

Optional but useful:

| Extension           | Publisher | Purpose                                                     |
| ------------------- | --------- | ----------------------------------------------------------- |
| ES7+ React snippets | dsznajder | Shortcuts for React boilerplate (`rafce`, `useState`, etc.) |

> **Backend developers:** without the Java Extension Pack, Java files may appear with red underlines in VS Code even if the code compiles correctly. Install it and run `Java: Reload Projects` from the command palette (`Cmd+Shift+P`) after opening the project.

> **Note on the Java Extension Pack:** it requires the project's Maven dependencies to be downloaded at least once (`./mvnw dependency:resolve` in the `backend/` folder) before VS Code can fully resolve all imports.

### Postman

Postman can be used to test backend APIs.

Download: https://www.postman.com/downloads/

---

## Troubleshooting

If you encounter issues during setup:

- verify installed versions of required tools
- ensure Docker is running
- verify SSH access to GitHub
- for Java import errors in VS Code, run `Java: Reload Projects` from the command palette
