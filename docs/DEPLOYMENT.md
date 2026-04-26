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
 │   [ cloudflared pod (hostNetwork) ]──► [ nginx-ingress (microk8s addon) :80 ]    │
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
| Cloudflare tunnel                   | Kubernetes Deployment in `k8s/cloudflared/` (`hostNetwork: true`) | Part of the cluster, kubelet restarts the pod if it dies |
| CD auto-deploy                      | Self-hosted GitHub Actions runner as systemd service          | `actions.runner.*.service`, `enabled` by systemd       |

### Prerequisites (one-time, already done under PINFO-133)

- microk8s addons enabled: `dns`, `ingress`, `hostpath-storage`, `metrics-server`
- Namespace `unigevents` created (see `k8s/namespace.yaml`)
- Image pull secret `ghcr-pull-secret` (type `dockerconfigjson`) created in `unigevents`, backed by a GitHub Personal Access Token scoped to `read:packages`
- Per-service DB secrets `<svc>-db-secret` created — **never committed to Git** (see [`k8s/README.md`](../k8s/README.md) for the one-shot creation loop)
- `cloudflared-token` Secret created in `unigevents` with the tunnel token from the Cloudflare dashboard (see [`k8s/README.md`](../k8s/README.md#cloudflared-tunnel-token-one-time-manual--not-committed))

### Deploying the manifests

All the `kubectl apply` commands, verification steps, and teardown procedures live in [`k8s/README.md`](../k8s/README.md). This section only covers the **big-picture order** and the pieces unique to prod (runner + tunnel). Do not duplicate commands here; follow the k8s README.

Deploy order (once cluster prerequisites are in place):

1. `k8s/namespace.yaml` — the namespace
2. `k8s/{user,event,registration,notification,search,moderation}-service/` — the 6 microservices + their DBs (order-independent)
3. `k8s/kong/` — the API gateway (ConfigMap, Deployment, Service)
4. `k8s/frontend/` — the React SPA
5. `k8s/ingress/` — the Ingress that wires `/api` → Kong and `/` → frontend
6. `k8s/cloudflared/` — the Cloudflare Tunnel pod (requires the `cloudflared-token` Secret)

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

The app is exposed to the public internet through a Cloudflare Tunnel. `cloudflared` runs **inside the microk8s cluster** as a single-replica Deployment (`k8s/cloudflared/`), opens an outbound connection to Cloudflare's edge, and forwards incoming HTTPS traffic to the local Ingress. TLS is terminated on the Cloudflare side — no certificate to manage on the VM.

Running cloudflared in-cluster (rather than as a standalone Docker container) keeps the entire app managed by one orchestrator: `kubectl` is the single interface for deploys, logs, restarts, and secrets. The pod uses `hostNetwork: true` so it can reach the nginx-ingress controller on `localhost:80` — the same path that makes `curl http://10.25.10.131/` work from the VM — without requiring any Cloudflare-side reconfiguration of the tunnel target.

**Token storage** — the tunnel token is a Kubernetes Secret named `cloudflared-token` in the `unigevents` namespace. It is **never committed to Git**. Create it out-of-band, once, with the token issued by the Cloudflare dashboard:

```bash
kubectl create secret generic cloudflared-token \
  --namespace=unigevents \
  --from-literal=token='PASTE_CLOUDFLARE_TUNNEL_TOKEN_HERE'
```

**Deploy the tunnel:**

```bash
kubectl apply -f k8s/cloudflared/
```

The Deployment starts the tunnel, Kubernetes restarts the pod if it crashes, and the pod is auto-scheduled at cluster/node startup. No additional systemd unit or Docker run command to manage on the VM.

**Day-to-day operations:**

```bash
kubectl logs    -n unigevents deploy/cloudflared -f                # live logs
kubectl rollout restart deployment/cloudflared -n unigevents      # e.g. after rotating the token
kubectl scale   deployment/cloudflared -n unigevents --replicas=0 # take the tunnel down
kubectl scale   deployment/cloudflared -n unigevents --replicas=1 # bring it back up
```

**Rotating the token:**

```bash
kubectl delete secret cloudflared-token -n unigevents
kubectl create secret generic cloudflared-token \
  --namespace=unigevents \
  --from-literal=token='PASTE_NEW_TOKEN'
kubectl rollout restart deployment/cloudflared -n unigevents
```

The `rollout restart` is required because the pod reads the Secret into an env var at start time — a Secret update alone does not propagate to an already-running pod.

**Updating the cloudflared image:** edit `k8s/cloudflared/cloudflared-deployment.yaml` (field `image:`), commit, merge. The CD pipeline deliberately excludes cloudflared from the auto-rollout (like Kong), so you must apply manually after the merge:

```bash
kubectl apply -f k8s/cloudflared/
kubectl rollout restart deployment/cloudflared -n unigevents
```

#### Host-level kernel tuning (one-time, required for QUIC)

cloudflared talks to the Cloudflare edge over **QUIC** (UDP). Because the pod runs with `hostNetwork: true`, it inherits the VM's UDP socket buffer limits. Ubuntu's defaults are too small for QUIC's preferred buffer (~7 MiB), which causes some of the 4 edge connections to flap with `failed to run the datagram handler error="context canceled"` and a startup warning along the lines of:

```
failed to sufficiently increase receive buffer size (was: 208 kiB, wanted: 7168 kiB, got: 416 kiB).
```

The 3 connections that survive are enough to carry traffic, so the public URL keeps working — but the logs are noisy and one slot stays unhealthy. Raise the limits on the VM (one-time, persisted across reboots):

```bash
# On pinfo1, applies immediately
sudo sysctl -w net.core.rmem_max=7500000
sudo sysctl -w net.core.wmem_max=7500000

# Persist across reboots
echo 'net.core.rmem_max=7500000' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max=7500000' | sudo tee -a /etc/sysctl.conf

# Restart the pod so it picks up the new buffer
kubectl rollout restart deployment/cloudflared -n unigevents
```

Validate by tailing the logs after the rollout — you should see **4 `Registered tunnel connection`** lines (one per `connIndex` 0–3) and no `Retrying connection` loop:

```bash
kubectl logs -n unigevents deploy/cloudflared --tail=30
```

This sysctl tuning lives on the host, not in any manifest. If `pinfo1` is ever reinstalled (or replaced), reapply these two lines before bringing cloudflared back up.

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

### Observability (Prometheus + Grafana)

We use the **microk8s `observability` addon**, which deploys the
upstream `kube-prometheus-stack` (Prometheus + Grafana + Alertmanager +
node-exporter + kube-state-metrics) plus Loki and Tempo, all into the
`observability` namespace. Nothing custom — it's the community stack
with the dashboards already wired up.

#### One-time setup (on `pinfo1`)

```bash
microk8s enable observability
```

The command takes ~2 min and prints, at the end, the default Grafana
credentials:

```
Note: the Grafana dashboard will be available at http://<node>:<port>
      (user/pass: admin/prom-operator)
```

Verify the pods are up:

```bash
microk8s kubectl get pods -n observability
# Everything should be Running.
```

Grafana is **not** exposed publicly (no Ingress, no Cloudflare tunnel
route — by design). It's only reachable from inside the cluster, so
you go through a port-forward.

#### Accessing Grafana from your laptop

You need the UNIGE VPN up (the VM `pinfo1` lives on `10.25.10.131`).
Two hops:

1. Open an SSH tunnel from your laptop to `pinfo1`, forwarding a local
   port to the kubectl port-forward you'll start on the VM:

   ```bash
   ssh -L 3000:localhost:3000 <user>@10.25.10.131
   ```

2. **Inside that SSH session**, run the kubectl port-forward:

   ```bash
   microk8s kubectl port-forward -n observability svc/kube-prom-stack-grafana 3000:80
   ```

3. On your laptop, open <http://localhost:3000> and log in with
   `admin` / `prom-operator`.

Both the SSH tunnel and the port-forward must stay open while you
browse Grafana. Closing either drops the session.

> **Tip — zsh function.** If you do this often, drop this in your
> `~/.zshrc` on your laptop so a single command opens the tunnel and
> starts the port-forward for you (a function, not an alias — aliases
> get the quoting wrong on multi-line `ssh "..."` commands):
>
> ```bash
> grafana-on() {
>   ssh -tt -L 3000:localhost:3000 <user>@10.25.10.131 \
>     "pkill -f 'port-forward.*grafana' 2>/dev/null; \
>      microk8s kubectl port-forward -n observability svc/kube-prom-stack-grafana 3000:80"
> }
> ```
>
> Then `source ~/.zshrc`, run `grafana-on`, and open
> <http://localhost:3000>. The `pkill` line cleans up any leftover
> port-forward from a previous session that may not have exited
> cleanly when you hit Ctrl-C; `-tt` forces SSH to allocate a TTY so
> Ctrl-C reliably propagates to `kubectl` next time.

#### Finding the `unigevents` namespace in dashboards

The addon ships dozens of pre-built dashboards. The most useful ones
for our app:

- **Dashboards → Browse → "Kubernetes / Compute Resources / Namespace (Pods)"**
  → in the **`namespace`** dropdown at the top, pick `unigevents`. You
  get CPU/memory/network per pod for all our microservices.
- **"Kubernetes / Compute Resources / Pod"** — same thing but
  drill-down to a single pod.
- **"Node Exporter / Nodes"** — host-level CPU, RAM, disk, network on
  `pinfo1` itself.

If a dashboard shows "No data", check that the time range (top right)
isn't set to a window before the addon was enabled.

#### Disabling / removing

```bash
microk8s disable observability
```

This deletes the `observability` namespace and frees the ~1.5 GB RAM
the stack uses.

### Headlamp (Kubernetes desktop UI)

[Headlamp](https://headlamp.dev/) is an Electron-based GUI for
Kubernetes — same data as `kubectl`, but clickable. Useful when you
want to glance at pod logs, restart a deployment, or describe a
resource without building up the kubectl muscle memory.

#### Install on macOS

```bash
brew install --cask headlamp
```

#### Point it at the cluster

Headlamp reads `~/.kube/config`. Export the microk8s kubeconfig from
`pinfo1`:

```bash
# On pinfo1
microk8s config > /tmp/microk8s-config

# On your laptop
scp <user>@10.25.10.131:/tmp/microk8s-config ~/.kube/config
```

> The kubeconfig points at `https://10.25.10.131:16443`, so you need
> the **UNIGE VPN** up to use Headlamp (same constraint as `kubectl`
> against the cluster).

Open Headlamp → it should auto-detect the `microk8s-cluster` context
in the sidebar.

#### macOS Gatekeeper: "Apple n'a pas pu confirmer que Headlamp ne contenait pas de logiciel malveillant"

Headlamp isn't notarized by Apple, so the first launch is blocked.
Three ways to bypass (any one works):

- **Right-click → Open** in Finder. The dialog now has an "Open"
  button. macOS remembers the choice; subsequent launches work
  normally.
- **System Settings → Privacy & Security**, scroll down — there's an
  "Open Anyway" button next to a line about Headlamp being blocked.
- **Terminal:** strip the quarantine xattr:
  ```bash
  xattr -d com.apple.quarantine /Applications/Headlamp.app
  ```

After any of these, double-clicking the icon works as expected.

### Common operational tasks

| Task                                         | Where                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Deploy / apply manifests                     | [`k8s/README.md`](../k8s/README.md#deploy)                                                      |
| Verify pod status, view logs                 | [`k8s/README.md`](../k8s/README.md#verify)                                                      |
| Update Kong routing (kong.yml)               | [`k8s/README.md`](../k8s/README.md#when-kong-config-changes-manual-step)                        |
| Self-hosted runner down, re-register, logs   | [`k8s/README.md`](../k8s/README.md#self-hosted-runner--runbook)                                 |
| Rotate a DB password                         | [`k8s/README.md`](../k8s/README.md#per-service-secrets-one-time-per-cluster-manual--not-committed) |
| Rotate the Cloudflare token                  | This doc, section "Cloudflare Tunnel"                                                           |
| Open Grafana (cluster + app metrics)         | This doc, section "Observability (Prometheus + Grafana)"                                        |
| Browse the cluster with a GUI                | This doc, section "Headlamp (Kubernetes desktop UI)"                                            |
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
