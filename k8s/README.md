# Kubernetes manifests — UNIGEvents prod (microk8s)

This directory contains the Kubernetes manifests used to deploy UNIGEvents to the production microk8s cluster (`pinfo1`).

## Layout

```
k8s/
├── namespace.yaml                    # unigevents namespace
├── user-service/                     # 6 backend microservices, one folder each
│   ├── user-db-statefulset.yaml      #   Postgres StatefulSet (+ volumeClaimTemplate)
│   ├── user-db-service.yaml          #   Headless Service for the StatefulSet
│   ├── user-service-deployment.yaml  #   Quarkus app Deployment
│   └── user-service-service.yaml     #   ClusterIP Service for the app
├── event-service/                    # same pattern
├── notification-service/             # same pattern
├── moderation-service/               # same pattern
├── search-service/                   # same pattern
├── registration-service/             # same pattern
├── kong/                             # API gateway (JWT + routing to the 6 services)
│   ├── kong-configmap.yaml           #   declarative config (mirrors backend/kong/kong.yml)
│   ├── kong-deployment.yaml          #   kong:3.5 DB-less, admin API disabled
│   └── kong-proxy-service.yaml       #   ClusterIP :8000
├── frontend/                         # React/Vite SPA served by nginx
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml         #   ClusterIP :80
├── ingress/
│   └── unigevents-ingress.yaml       # /api → kong-proxy, / → frontend (HTTP only at ingress level)
├── cloudflared/                      # Cloudflare Tunnel (public HTTPS entry point)
│   └── cloudflared-deployment.yaml   #   hostNetwork pod, token from a k8s Secret
└── backup/                           # Nightly Postgres pg_dumpall to a PVC
    ├── postgres-backup-pvc.yaml      #   10Gi PVC on microk8s-hostpath
    ├── postgres-backup-script.yaml   #   ConfigMap holding the bash script
    └── postgres-backup-cronjob.yaml  #   CronJob @ 02:00 Europe/Zurich, retention 7d
```

## Services overview

| Service               | App port | DB name          | DB user              | DB secret name           |
| --------------------- | -------- | ---------------- | -------------------- | ------------------------ |
| user-service          | 8081     | users_db         | user_service         | user-db-secret           |
| event-service         | 8082     | events_db        | event_service        | event-db-secret          |
| notification-service  | 8083     | notifications_db | notification_service | notification-db-secret   |
| moderation-service    | 8084     | moderation_db    | moderation_service   | moderation-db-secret     |
| search-service        | 8085     | search_db        | search_service       | search-db-secret         |
| registration-service  | 8086     | registrations_db | registration_service | registration-db-secret   |

## Prerequisites (one-time cluster setup)

Already done under PINFO-133 — kept here as a reference:

- microk8s addons: `dns`, `ingress`, `hostpath-storage`, `metrics-server`
- Namespace `unigevents` created
- Image pull secret `ghcr-pull-secret` (type `dockerconfigjson`) created in namespace `unigevents` with a GitHub PAT scoped to `read:packages`

## Per-service secrets (one-time per cluster, manual — not committed)

Database credentials are stored in Kubernetes Secrets that are **never committed to Git**. Create them with `kubectl` before the first `apply`.

### Create all 6 DB secrets at once

```bash
# Each service gets its own random password, injected into its own Secret.
for svc in user event notification moderation search registration; do
  db_user="${svc}_service"
  pwd=$(openssl rand -base64 24)
  kubectl create secret generic "${svc}-db-secret" \
    --namespace=unigevents \
    --from-literal=username="${db_user}" \
    --from-literal=password="${pwd}"
  # ⚠ The generated password is never shown. If you need it later,
  # extract it with the `kubectl get ... | base64 -d` command below.
  unset pwd
done
```

### Already exists? That's expected.

`kubectl create secret` is **intentionally not idempotent**. If you get `Error from server (AlreadyExists)`, the secret is already in the cluster — **do not re-create it**. The loop above will skip existing secrets and create only the missing ones (each iteration independently errors on existing names without touching their values).

If you ever need to read back an existing password (e.g. to `psql` into the database):

```bash
kubectl get secret user-db-secret -n unigevents \
  -o jsonpath='{.data.password}' | base64 -d ; echo
```

(Replace `user-db-secret` with the secret name of the service you need.)

To **rotate** a password (rare, destructive — breaks existing DB auth until the user is `ALTER`ed or the PVC is wiped):

```bash
kubectl delete secret user-db-secret -n unigevents
# ... then re-run the create command above with a new password
```

## Cloudflared tunnel token (one-time, manual — not committed)

`k8s/cloudflared/cloudflared-deployment.yaml` reads the Cloudflare tunnel
token from a Secret named `cloudflared-token` (key: `token`). Create it
once, out-of-band, with the token issued by the Cloudflare dashboard:

```bash
kubectl create secret generic cloudflared-token \
  --namespace=unigevents \
  --from-literal=token='PASTE_CLOUDFLARE_TUNNEL_TOKEN_HERE'
```

To **rotate** the token (after issuing a new one on Cloudflare):

```bash
kubectl delete secret cloudflared-token -n unigevents
kubectl create secret generic cloudflared-token \
  --namespace=unigevents \
  --from-literal=token='PASTE_NEW_TOKEN'
kubectl rollout restart deployment/cloudflared -n unigevents
```

The `rollout restart` is required because the pod reads the env from
the Secret at start time — a Secret update alone does not propagate to
an already-running pod.

## Deploy

From the repo root:

```bash
# Namespace (idempotent — safe to re-run)
kubectl apply -f k8s/namespace.yaml

# All 6 backend services (order-independent — k8s resolves dependencies)
kubectl apply -f k8s/user-service/
kubectl apply -f k8s/event-service/
kubectl apply -f k8s/notification-service/
kubectl apply -f k8s/moderation-service/
kubectl apply -f k8s/search-service/
kubectl apply -f k8s/registration-service/

# API gateway + frontend + external exposure
kubectl apply -f k8s/kong/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/

# Public HTTPS entry point (requires the cloudflared-token Secret, see above)
kubectl apply -f k8s/cloudflared/

# Nightly Postgres backups (CronJob + PVC + script ConfigMap)
kubectl apply -f k8s/backup/
```

### Accessing the app

Once the Ingress has an address (give it ~30 s after the first `apply`), the
app is reachable over plain HTTP from any machine that can route to the
cluster node:

```bash
# Check that the Ingress got an address
kubectl get ingress -n unigevents

# Frontend (SPA)
curl -I http://10.25.10.131/

# Backend via Kong — expect HTTP 401 (no JWT) on a protected route; that
# proves Kong is wired correctly.
curl -i http://10.25.10.131/api/users/me
```

In a browser, open `http://10.25.10.131/`.

> **TLS is terminated upstream by Cloudflare**, not at the Ingress. Public
> users reach the app through a Cloudflare Tunnel (`k8s/cloudflared/`),
> which receives HTTPS on the Cloudflare edge and forwards HTTP over the
> tunnel to the Ingress on port 80. Plain HTTP on the VM's IP is only
> reachable from inside the UNIGE VPN and is not meant for end users.
>
> If we ever need TLS at the Ingress too (e.g. to stop using Cloudflare
> or to secure VPN-only access), install `cert-manager`, add a
> `ClusterIssuer`, and extend the Ingress with a `tls:` block + a
> `host:` on each rule. Requires a public DNS name.

### Updating the Kong config

`backend/kong/kong.yml` is the source of truth. `k8s/kong/kong-configmap.yaml`
embeds a copy of it. When routing or JWT config changes:

```bash
# 1) Edit backend/kong/kong.yml AND mirror the change in
#    k8s/kong/kong-configmap.yaml (same commit).
# 2) Apply the new ConfigMap and restart Kong so it reloads.
kubectl apply -f k8s/kong/kong-configmap.yaml
kubectl rollout restart deployment/kong -n unigevents
```

## Verify

```bash
# All 15 pods should reach Running / Ready = 1/1
#   6 app pods + 6 DB pods + 1 Kong + 1 frontend + 1 cloudflared
kubectl get pods -n unigevents -w

# Logs for a specific service
kubectl logs -n unigevents deploy/user-service --tail=50 -f
kubectl logs -n unigevents statefulset/user-db --tail=50
kubectl logs -n unigevents deploy/cloudflared --tail=50   # expect "Registered tunnel connection" x4

# Resource usage (needs metrics-server)
kubectl top pods -n unigevents

# In-cluster DNS check (from a throwaway pod)
kubectl run curltest --rm -it --image=curlimages/curl --restart=Never -n unigevents \
  -- curl -v http://user-service:8081/q/health 2>&1 || true
```

### Cold-start note

Quarkus in JVM mode takes 30–60 s to open its HTTP port on a cold boot, especially when 6 services start in parallel on a 2-CPU node. Readiness/liveness probes are configured with `initialDelaySeconds: 40` / `90` to tolerate this. Expect the first rollout to take a few minutes before everything is `1/1`.

## Continuous deployment (auto-rollout)

Every merge to `develop` triggers `.github/workflows/cd.yml`, which:

1. Builds the 7 Docker images (6 backend services + frontend) and pushes them to `ghcr.io`.
2. On a **self-hosted GitHub Actions runner** running on the prod VM itself (`pinfo1`), calls `kubectl rollout restart` on the 7 matching Deployments. Because each Deployment uses `imagePullPolicy: Always`, new pods pull the freshly-pushed `:latest` image.
3. Waits for each rollout to reach `Available` (timeout: 180 s/service). If a rollout fails, the CD turns red.

No manual action is needed after a merge. Check Actions tab on GitHub — the `Rollout new images on microk8s` job should succeed a few minutes after the image builds finish.

### When Kong config changes (manual step)

The CD job does **not** restart Kong, because its image is a fixed `kong:3.5` that never changes with application code. When you edit `backend/kong/kong.yml`, you must:

1. Mirror the edit in `k8s/kong/kong-configmap.yaml` (same commit).
2. After the branch is merged and CD has run, apply the ConfigMap and restart Kong so it reloads the declarative config:

   ```bash
   kubectl apply -f k8s/kong/kong-configmap.yaml
   kubectl rollout restart deployment/kong -n unigevents
   ```

### Self-hosted runner — runbook

The runner is a small agent (~40 MB RAM) installed on `pinfo1` as a systemd service running under the dedicated user `gha-runner`. It maintains an outbound long-poll connection to GitHub — no inbound port is opened on the VM.

**Check it is online:**

- GitHub: *Settings → Actions → Runners* → `pinfo1` must be 🟢 `Idle`.
- On the VM: `sudo systemctl status 'actions.runner.*'` → should be `active (running)`.

**If the runner is offline** (🔴 on GitHub, a CD job stays queued):

```bash
# SSH to pinfo1 as your UNIGE user, then:
sudo systemctl restart 'actions.runner.*'
sudo systemctl status  'actions.runner.*'
sudo journalctl -u 'actions.runner.*' -n 50 --no-pager   # last 50 log lines
```

**If you need to re-register the runner** (e.g. after losing the config):

```bash
sudo -i
cd /home/gha-runner/actions-runner
./svc.sh stop
./svc.sh uninstall
sudo -u gha-runner ./config.sh remove --token <fresh-removal-token-from-github-UI>
# then follow the install steps from scratch — see GitHub docs
```

**Security note:** the runner executes whatever a workflow running on `develop` tells it to, with the permissions of the `gha-runner` user (member of the `microk8s` group). Never merge to `develop` workflow changes from an untrusted source.

### Cloudflared tunnel — runbook

The tunnel is a single-replica Deployment under `k8s/cloudflared/`, running with `hostNetwork: true` so it can reach the nginx-ingress controller on `localhost:80` (the same path that makes `curl http://10.25.10.131/` work from within the VM). The tunnel token comes from the `cloudflared-token` Secret in the `unigevents` namespace.

**Check it is healthy:**

```bash
kubectl get pods -n unigevents -l app=cloudflared          # expect 1/1 Running
kubectl logs  -n unigevents deploy/cloudflared --tail=30   # expect "Registered tunnel connection" on 4 edges
```

A readiness probe hits cloudflared's `/ready` endpoint on `127.0.0.1:2000` (started by `--metrics 127.0.0.1:2000`), which returns 200 only when the tunnel has live connections to Cloudflare. If readiness stays `0/1`, the tunnel failed to register — check the token and Cloudflare dashboard.

**Public URL returns 502:**

1. `kubectl get pods -n unigevents -l app=cloudflared` — is the pod Running?
2. `kubectl logs -n unigevents deploy/cloudflared --tail=50` — look for auth errors (invalid/revoked token).
3. `kubectl get svc,pods -n unigevents` — is the nginx-ingress still up? `kubectl get pods -n ingress` on the microk8s ingress addon.

**Rotate the token:** see the "Cloudflared tunnel token" section at the top of this file.

**Update the cloudflared image version:** edit `k8s/cloudflared/cloudflared-deployment.yaml` (field `image:`), commit, merge. The CD pipeline does NOT auto-restart cloudflared (it restarts only application workloads), so after merge you also need:

```bash
kubectl apply -f k8s/cloudflared/
kubectl rollout restart deployment/cloudflared -n unigevents
```

**Host-level UDP buffer tuning (one-time, required for QUIC):** because the pod runs with `hostNetwork: true`, it inherits the VM's UDP socket buffer limits. Ubuntu's defaults are smaller than what QUIC wants (~7 MiB), causing one of the 4 edge connections to flap with `failed to run the datagram handler error="context canceled"`. The fix lives on the host, not in any manifest — see [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md#host-level-kernel-tuning-one-time-required-for-quic) for the `sysctl` commands. If `pinfo1` is reinstalled, this needs to be reapplied before bringing cloudflared back up.

### Postgres backups — runbook

A daily `CronJob` named `postgres-backup` runs `pg_dumpall` against each of the 6 microservice Postgres servers, gzips the result, and stores it on a shared `postgres-backups` PVC. Retention is 7 days — older dumps are deleted automatically at the end of each run.

**Schedule:** `02:00 Europe/Zurich` every day. The schedule is anchored on local time via `spec.timeZone`, so the cron fires at the same wall-clock time across DST switches.

**On-disk layout** (inside the PVC, mounted at `/backups` in the Job pod):

```
/backups/
├── user-db/
│   ├── 2026-04-23.sql.gz
│   ├── 2026-04-24.sql.gz
│   └── 2026-04-25.sql.gz
├── event-db/
└── ... (one folder per service)
```

The PVC is backed by `microk8s-hostpath`, so on the VM the actual files live under `/var/snap/microk8s/common/default-storage/unigevents-postgres-backups-*/`.

**Verify the backup is healthy:**

```bash
# Recent runs (3 successful + 3 failed are kept)
kubectl get jobs -n unigevents -l app=postgres-backup

# Logs from the most recent run
kubectl logs -n unigevents -l app=postgres-backup --tail=100

# List dumps on disk (uses an ephemeral pod that mounts the same PVC)
kubectl run -n unigevents --rm -it --restart=Never tmp-backup-ls \
  --image=alpine --overrides='{"spec":{"containers":[{"name":"tmp-backup-ls","image":"alpine","command":["ls","-lh","/backups"],"volumeMounts":[{"name":"b","mountPath":"/backups"}]}],"volumes":[{"name":"b","persistentVolumeClaim":{"claimName":"postgres-backups"}}]}}'
```

**Force a backup right now** (out-of-schedule, useful before risky operations like a major Quarkus upgrade):

```bash
kubectl create job -n unigevents \
  --from=cronjob/postgres-backup \
  postgres-backup-manual-$(date +%s)
kubectl get jobs -n unigevents -w
```

**Restore a database from a dump:** the dumps are produced with `--clean --if-exists`, meaning replaying them DROPS the existing schemas and recreates everything. Do this with extreme caution.

```bash
# Pick the dump you want
DUMP=2026-04-25.sql.gz
DB=user-db

# Stream it through psql via an ephemeral pod that has both
# /backups (the PVC) and access to the target DB Service.
kubectl run -n unigevents --rm -it --restart=Never restore-tmp \
  --image=postgres:17-alpine \
  --env="PGPASSWORD=$(kubectl get secret ${DB}-secret -n unigevents -o jsonpath='{.data.password}' | base64 -d)" \
  --overrides='{"spec":{"containers":[{"name":"restore-tmp","image":"postgres:17-alpine","stdin":true,"tty":true,"command":["sh","-c","gunzip < /backups/'"$DB"'/'"$DUMP"' | psql -h '"$DB"' -U $(cat /secrets/'"$DB"'/username)"],"volumeMounts":[{"name":"b","mountPath":"/backups"},{"name":"s","mountPath":"/secrets/'"$DB"'"}]}],"volumes":[{"name":"b","persistentVolumeClaim":{"claimName":"postgres-backups"}},{"name":"s","secret":{"secretName":"'"$DB"'-secret"}}]}}'
```

A simpler alternative: `kubectl cp` the dump to your laptop, restore it locally against a port-forwarded `kubectl port-forward svc/<db> 5432:5432`. Whichever you find easier.

**Adding a 7th database to the schedule:** two edits, both required —

1. Append the new service name to the `DATABASES` variable in `k8s/backup/postgres-backup-script.yaml`.
2. Add a new `volumeMount` (under the container) AND `volume` (referencing the matching `<service>-secret`) entry in `k8s/backup/postgres-backup-cronjob.yaml`.

Then `kubectl apply -f k8s/backup/`.

**Resize the backup PVC** (default is 10 Gi, plenty for the current dataset): `microk8s-hostpath` supports volume expansion. Edit the `spec.resources.requests.storage` field of `k8s/backup/postgres-backup-pvc.yaml`, `kubectl apply`, the size grows in place. Shrinking is not supported.

## Teardown (destructive)

```bash
# Remove app workloads but keep the namespace and secrets
kubectl delete -f k8s/backup/
kubectl delete -f k8s/cloudflared/
kubectl delete -f k8s/ingress/
kubectl delete -f k8s/frontend/
kubectl delete -f k8s/kong/
for d in user event notification moderation search registration; do
  kubectl delete -f "k8s/${d}-service/"
done

# OR nuke everything (including all Secrets and PVC data)
kubectl delete namespace unigevents
```

## Conventions

- Every resource has `app.kubernetes.io/part-of: unigevents` for filtering.
- Service names match the in-cluster DNS expected by the application (e.g. `user-db` resolves to the `user-db` Postgres Service).
- Deployments pull images from `ghcr.io/machanier/pinfo-2026-team1/<service>:latest`.
- `imagePullPolicy: Always` ensures new `:latest` builds are picked up on pod restart. Combined with the CD-triggered `rollout restart`, this gives automatic redeploys on every merge to `develop`. A production-grade setup would use immutable `:<sha>` tags and update the Deployment manifest on each build instead, but for this project the `:latest` + rollout-restart combo is simpler and sufficient.
- Postgres DBs use a `StatefulSet` with `volumeClaimTemplates` (1 Gi / service on `microk8s-hostpath`) so data survives pod restarts.
- App ↔ DB authentication uses a per-service `<svc>-db-secret` with `username` + `password` keys, referenced by both the StatefulSet (to initialize the Postgres user) and the Deployment (to connect).
