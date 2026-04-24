# Deployment Guide

This document describes how to run the **UNIGEvents** application as containers using Docker Compose.

> For day-to-day development (Dev Container or manual setup), see the [Installation Guide](INSTALL.md).

---

## Docker Compose Deployment

This setup runs the **database layer for all backend microservices** in Docker. Backend services are then run in Quarkus dev mode.

An optional `fullstack` profile is also available to run DB + backend services + Kong + frontend with a single command.

### Prerequisites

- Docker Desktop installed and running ([installation guide](INSTALL.md))
- Repository cloned

### Steps

**1. Create your local environment file:**

```bash
cp docker/.env.example docker/.env
```

Edit `docker/.env` if needed (default values work out of the box).

**2. (Optional) Build backend artifacts with the dev profile:**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
```

On Linux (adjust the path to your JDK 21 installation if needed):

```bash
./backend/mvnw -f backend/pom.xml clean package -DskipTests -Dquarkus.profile=dev
```

> **Why `-Dquarkus.profile=dev`?**
> Some Quarkus properties (like `schema-management.strategy` and `sql-load-script`) are resolved at **build time**.
> Building with the `dev` profile ensures the schema is recreated on startup and `import.sql` seed data is loaded.

**3. Start the database containers:**

```bash
docker compose -f docker/docker-compose.yml up -d
```

Optional fullstack mode:

```bash
docker compose -f docker/docker-compose.yml --profile fullstack up -d
```

This starts:

| Service         | URL              |
| --------------- | ---------------- |
| User DB         | `localhost:5433` |
| Event DB        | `localhost:5434` |
| Registration DB | `localhost:5435` |
| Notification DB | `localhost:5436` |
| Search DB       | `localhost:5437` |
| Moderation DB   | `localhost:5438` |

With `--profile fullstack`, Docker Compose starts the database containers listed above **plus** these backend and edge services:

| Service              | URL              |
| -------------------- | ---------------- |
| User service         | `localhost:8081` |
| Event service        | `localhost:8082` |
| Notification service | `localhost:8083` |
| Moderation service   | `localhost:8084` |
| Search service       | `localhost:8085` |
| Registration service | `localhost:8086` |
| Kong proxy           | `localhost:8000` |
| Kong admin           | `localhost:8001` |
| React frontend       | `localhost:3000` |

**4. Start backend services manually (DB-only mode):**

> **Skip this step if you used `--profile fullstack`** — the backend services are already running as containers.

When running in default mode (databases only), start each backend service in Quarkus dev mode (one terminal per service):

```bash
cd backend
./mvnw -pl user-service quarkus:dev
./mvnw -pl event-service quarkus:dev
./mvnw -pl registration-service quarkus:dev
./mvnw -pl notification-service quarkus:dev
./mvnw -pl search-service quarkus:dev
./mvnw -pl moderation-service quarkus:dev
```

**5. Stop containers:**

```bash
docker compose -f docker/docker-compose.yml down
```

If you started the `fullstack` profile, stop with the same profile flag:

```bash
docker compose -f docker/docker-compose.yml --profile fullstack down
```

To also delete the database volume (reset all data):

```bash
docker compose -f docker/docker-compose.yml down -v
```

---

## Environment Variables

Environment variables are defined in `docker/.env` (see `docker/.env.example` for defaults).

See [docker/.env.example](../docker/.env.example) for all variables.

Variables are grouped by microservice database:

- `USER_DB_*`
- `EVENT_DB_*`
- `REGISTRATION_DB_*`
- `NOTIFICATION_DB_*`
- `SEARCH_DB_*`
- `MODERATION_DB_*`
- `FRONTEND_PORT` — React frontend host port (default: `3000`)

---

## Using Pre-built Images (from CD)

Instead of building locally, you can pull the latest images from GitHub Container Registry:

```bash
docker pull ghcr.io/machanier/pinfo-2026-team1/backend:latest
docker pull ghcr.io/machanier/pinfo-2026-team1/frontend:latest
```

These images are automatically built and pushed by the [CD pipeline](CI-CD.md) on every merge to `develop`.

---

## Production Deployment (microk8s on `pinfo1`)

Production runs on a single-node **microk8s** cluster hosted on the UNIGE VM `pinfo1` (`10.25.10.131`, 2 CPU / 16 GB RAM, Ubuntu). Reaching the VM requires the UNIGE VPN for administrative access. End-user traffic reaches the app through a **Cloudflare Tunnel** that terminates TLS on the Cloudflare edge.

### Architecture at a glance

```
    [ End user browser ]
            │  HTTPS (public URL)
            ▼
   ┌────────────────────┐
   │  Cloudflare edge   │   ── TLS cert provided by Cloudflare
   └────────┬───────────┘
            │  outbound tunnel (initiated from pinfo1, no inbound port)
            ▼
 ┌─────────────────────────────────── pinfo1 (VM) ───────────────────────────────────┐
 │                                                                                   │
 │   [ cloudflared container ]──► [ nginx-ingress (microk8s addon) :80 ]            │
 │                                          │                                        │
 │                          ┌───────────────┼───────────────┐                       │
 │                          │               │               │                        │
 │                    path: /         path: /api            │                        │
 │                          ▼               ▼               │                        │
 │                    [ frontend ]    [ kong-proxy ] ──► [ 6 microservices + 6 DBs ]│
 │                    nginx serving   JWT validation        per-service Deployment + │
 │                    the React SPA   + routing             StatefulSet              │
 │                                                                                   │
 │   [ self-hosted GH Actions runner ] ─── outbound HTTPS to github.com             │
 │   Receives CD jobs, runs `microk8s kubectl rollout restart`                       │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

### Summary of moving parts

| Component                           | How it is deployed                                            | Persistence at boot                                    |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| microk8s cluster                    | Snap package on the VM                                        | systemd unit managed by snap                           |
| Application workloads (6 svc + fe)  | Kubernetes manifests in `k8s/`                                | Part of the cluster, restart with pods                 |
| Kong API gateway                    | Kubernetes manifests in `k8s/kong/`                           | Part of the cluster                                    |
| Ingress (nginx)                     | microk8s addon `ingress`                                      | Part of the cluster                                    |
| Cloudflare tunnel                   | `cloudflared` Docker container with `--restart unless-stopped`| Docker daemon restarts it at boot                      |
| CD auto-deploy                      | Self-hosted GitHub Actions runner as systemd service          | `actions.runner.*.service`, `enabled` by systemd       |

### Prerequisites (one-time, already done under PINFO-133)

- microk8s addons enabled: `dns`, `ingress`, `hostpath-storage`, `metrics-server`
- Namespace `unigevents` created (see `k8s/namespace.yaml`)
- Image pull secret `ghcr-pull-secret` (type `dockerconfigjson`) created in `unigevents`, backed by a GitHub Personal Access Token scoped to `read:packages`
- Per-service DB secrets `<svc>-db-secret` created — **never committed to Git** (see [`k8s/README.md`](../k8s/README.md) for the one-shot creation loop)

### Deploying the manifests

All the `kubectl apply` commands, verification steps, and teardown procedures live in [`k8s/README.md`](../k8s/README.md). This section only covers the **big-picture order** and the pieces unique to prod (runner + tunnel). Do not duplicate commands here; follow the k8s README.

Deploy order (once cluster prerequisites are in place):

1. `k8s/namespace.yaml` — the namespace
2. `k8s/{user,event,registration,notification,search,moderation}-service/` — the 6 microservices + their DBs (order-independent)
3. `k8s/kong/` — the API gateway (ConfigMap, Deployment, Service)
4. `k8s/frontend/` — the React SPA
5. `k8s/ingress/` — the Ingress that wires `/api` → Kong and `/` → frontend

### CD pipeline — what happens on merge to `develop`

`.github/workflows/cd.yml` runs 3 jobs:

1. **`build-backend-images`** (matrix, 6 parallel jobs on GitHub-hosted runners) — builds one Docker image per backend microservice from `backend/<service>/Dockerfile` and pushes `ghcr.io/machanier/pinfo-2026-team1/<service>:latest` + `:<short-sha>`.
2. **`build-frontend-image`** (GitHub-hosted runner) — builds `frontend/Dockerfile` and pushes `ghcr.io/machanier/pinfo-2026-team1/frontend:latest` + `:<short-sha>`.
3. **`deploy-to-microk8s`** (self-hosted runner on `pinfo1`, only runs after steps 1 and 2 succeed) — calls `microk8s kubectl rollout restart` on all 7 Deployments and waits for each rollout to complete. Because every Deployment uses `imagePullPolicy: Always`, new pods pull the fresh `:latest` tag.

No manual intervention is needed after a merge. Expected end-to-end time: ~5-8 min.

> **Kong is deliberately excluded from the auto-restart list.** Its image (`kong:3.5`) never changes with application code; it only needs to be restarted when `backend/kong/kong.yml` or `k8s/kong/kong-configmap.yaml` change. See [`k8s/README.md`](../k8s/README.md#when-kong-config-changes-manual-step) for the manual procedure.

### Self-hosted GitHub Actions runner

The `deploy-to-microk8s` job runs on a self-hosted runner installed on `pinfo1` itself. GitHub-hosted runners cannot reach the cluster API (`10.25.10.131:16443`) because it is only routable from the UNIGE VPN. A runner on the VM sidesteps this by **initiating an outbound connection** to GitHub.com — no inbound port is opened, no VPN credential is stored on GitHub.

**Identity** — the runner runs as the dedicated system user `gha-runner`, member of the `microk8s` group. It has no `sudo` and no access to other users' homes.

**Lifecycle** — managed by systemd as `actions.runner.machanier-pinfo-2026-team1.pinfo1.service`, `enabled` so it starts at boot.

**Security** — the runner executes whatever steps a workflow running on `develop` tells it to. Protect the `develop` branch (require PR review, disable force-push) and never merge workflow changes from an untrusted source.

See [`k8s/README.md`](../k8s/README.md#self-hosted-runner--runbook) for the day-to-day runbook (status check, restart, re-register).

### Cloudflare Tunnel (public HTTPS entry point)

The app is exposed to the public internet through a Cloudflare Tunnel. `cloudflared` runs as a Docker container on `pinfo1`, opens an outbound connection to Cloudflare's edge, and forwards incoming HTTPS traffic to the local Ingress (`http://localhost:80`). TLS is terminated on the Cloudflare side — no certificate to manage on the VM.

**Token storage** — the tunnel token is stored in `/etc/cloudflared/token` (`chmod 600`, owned by `root`), as an env-file:

```
TUNNEL_TOKEN=<redacted>
```

This keeps the token out of bash history and out of `docker inspect` output.

**Start (one-time, or after reboot if not persistent):**

```bash
sudo docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  --network host \
  --env-file /etc/cloudflared/token \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run
```

The `--restart unless-stopped` flag tells Docker to relaunch the container if it crashes, and to start it again when the Docker daemon starts (i.e. at boot). Docker on Ubuntu is enabled by default in systemd, so the tunnel is persistent across reboots without any additional systemd unit.

**Day-to-day operations:**

```bash
sudo docker logs -f cloudflared        # live logs
sudo docker restart cloudflared        # e.g. after rotating the token
sudo docker stop  cloudflared          # take the tunnel down (survives reboots as stopped)
sudo docker start cloudflared          # bring it back up
```

**Rotating the token:**

```bash
sudo nano /etc/cloudflared/token       # edit the TUNNEL_TOKEN= line
sudo docker restart cloudflared
```

### Post-deployment smoke test

Once the cluster is up and the tunnel is running, the following should all succeed:

```bash
# Frontend reachable through the public URL (Cloudflare-issued or your domain)
curl -I https://<your-cloudflare-url>/                   # expect 200

# Kong is wired and enforcing JWT
curl -i https://<your-cloudflare-url>/api/users/me       # expect 401 (no JWT)

# Inside the VPN, the IP still works directly (Ingress on port 80)
curl -I http://10.25.10.131/                             # expect 200
curl -i http://10.25.10.131/api/users/me                 # expect 401
```

### Common operational tasks

| Task                                         | Where                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Deploy / apply manifests                     | [`k8s/README.md`](../k8s/README.md#deploy)                                                      |
| Verify pod status, view logs                 | [`k8s/README.md`](../k8s/README.md#verify)                                                      |
| Update Kong routing (kong.yml)               | [`k8s/README.md`](../k8s/README.md#when-kong-config-changes-manual-step)                        |
| Self-hosted runner down, re-register, logs   | [`k8s/README.md`](../k8s/README.md#self-hosted-runner--runbook)                                 |
| Rotate a DB password                         | [`k8s/README.md`](../k8s/README.md#per-service-secrets-one-time-per-cluster-manual--not-committed) |
| Rotate the Cloudflare token                  | This doc, section "Cloudflare Tunnel"                                                           |
| Teardown                                     | [`k8s/README.md`](../k8s/README.md#teardown-destructive)                                        |

### Troubleshooting quick reference

| Symptom                                       | First thing to check                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| CD job `deploy-to-microk8s` stays queued     | Self-hosted runner offline. `sudo systemctl status 'actions.runner.*'` on `pinfo1`.           |
| CD job succeeds but pods not updated          | `kubectl get pods -n unigevents` — check `AGE`. Rollout may have timed out (check job logs).  |
| Public URL returns 502                         | Cloudflare tunnel down. `sudo docker ps --filter name=cloudflared`; `sudo docker logs cloudflared`. |
| Public URL returns 200 but `/api/...` returns 503 | Ingress can't reach `kong-proxy`. `kubectl get svc,pods -n unigevents`.                    |
| `/api/...` returns 401 with valid-looking JWT | Kong JWT plugin can't verify. Check `kong.yml` has the correct Auth0 issuer + public key; check `kubectl logs deploy/kong -n unigevents`. |
| Pod in `CrashLoopBackOff`                     | `kubectl logs <pod> -n unigevents --previous`. Often DB connection (wrong secret) or JVM OOM. |
| Pod stuck `Pending`                           | `kubectl describe pod <pod> -n unigevents`. Usually PVC can't bind or resources exhausted.    |
