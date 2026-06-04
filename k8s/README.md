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
├── kafka/                            # Async event bus (PINFO-202)
│   ├── kafka-statefulset.yaml        #   confluentinc/cp-kafka:7.6.0, KRaft single-broker
│   └── kafka-service.yaml            #   Headless Service, kafka:9092 (client) + 9093 (controller)
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
├── backup/                           # Nightly Postgres pg_dumpall to a PVC
│   ├── postgres-backup-pvc.yaml      #   10Gi PVC on microk8s-hostpath
│   ├── postgres-backup-script.yaml   #   ConfigMap holding the bash script
│   └── postgres-backup-cronjob.yaml  #   CronJob @ 02:00 Europe/Zurich, retention 7d
├── observability/                    # Prometheus ServiceMonitor for the Quarkus services
│   └── quarkus-services-monitor.yaml #   scraped by kube-prometheus-stack
└── network-policies/                 # Default-deny + allowlist for unigevents (PINFO-187)
    ├── 00-default-deny.yaml          #   block all ingress + egress in the namespace
    ├── 10-allow-dns.yaml             #   egress to coredns in kube-system
    ├── 11-allow-egress-https.yaml    #   egress 443 to non-private IPs (Auth0 JWKS)
    ├── 20-kong.yaml                  #   ingress from nginx-ingress, egress to backends
    ├── 30-frontend.yaml              #   ingress from nginx-ingress only
    ├── 40-backends.yaml              #   ingress from kong/peers/observability, egress to DBs/peers
    ├── 50-databases.yaml             #   ingress from backends + postgres-backup
    └── 60-postgres-backup.yaml       #   egress to DBs for the nightly cronjob
```

See [network-policies/README.md](network-policies/README.md) for a per-file
walkthrough, the rollback command if a missing rule breaks prod, and the
CNI prerequisite (Calico must be the active microk8s plugin — Flannel does
not enforce NetworkPolicy).

## Services overview

| Service               | App port | DB name          | DB user              | DB secret name           |
| --------------------- | -------- | ---------------- | -------------------- | ------------------------ |
| user-service          | 8081     | users_db         | user_service         | user-db-secret           |
| event-service         | 8082     | events_db        | event_service        | event-db-secret          |
| notification-service  | 8083     | notifications_db | notification_service | notification-db-secret   |
| moderation-service    | 8084     | moderation_db    | moderation_service   | moderation-db-secret     |
| search-service        | 8085     | search_db        | search_service       | search-db-secret         |
| registration-service  | 8086     | registrations_db | registration_service | registration-db-secret   |

The async event bus (Kafka, since PINFO-202) sits next to the backend services on `kafka:9092` inside the namespace. The services wired to it are `event-service`, `registration-service`, `user-service`, `moderation-service`, `search-service` and `notification-service` (the last consumes `registration.*` / `event.*` / `announcement.posted` to drive emails + in-app notifications). Every one of them must appear in the broker's ingress allowlist (`k8s/network-policies/45-kafka.yaml`) **and** carry `KAFKA_BOOTSTRAP_SERVERS=kafka:9092` in its deployment. See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the messaging topology.

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

## user-service internal key (one-time, manual — not committed)

`user-service` exposes `/internal/*` endpoints used by the other backend
services (e.g. event-service calls user-service to resolve organizer IDs).
`InternalServiceKeyFilter` checks the `X-Internal-Service-Key` header
against the `internal.service.key` config value, which is read from the
`INTERNAL_SERVICE_KEY` env var injected from a Secret named
`user-internal-key-secret`. **Never commit this value.** Create it once:

```bash
kubectl create secret generic user-internal-key-secret \
  --namespace=unigevents \
  --from-literal=key="$(openssl rand -base64 32)"
```

Every caller (each backend service that hits `/internal/*` on user-service)
needs the same value — read it back with `kubectl get secret … -o
jsonpath` and inject it into their own deployments the same way once
PINFO-184 lands on the caller side.

To **rotate** the key, recreate the Secret with a new value and restart
every consumer (a stale env var will keep the old key in memory):

```bash
kubectl delete secret user-internal-key-secret -n unigevents
kubectl create secret generic user-internal-key-secret \
  --namespace=unigevents \
  --from-literal=key="$(openssl rand -base64 32)"
kubectl rollout restart deployment/user-service -n unigevents
# + restart every other service that calls /internal/* once they consume the secret
```

## notification-service Mailtrap SMTP (one-time, manual — optional)

`notification-service` sends email through Mailtrap. The credentials are read
from the `MAILTRAP_USERNAME` / `MAILTRAP_PASSWORD` env vars, injected from a
Secret named `notification-mailtrap-secret`. The `secretKeyRef` is
**`optional: true`**: the service boots and serves in-app notifications even
when the Secret is absent — email simply degrades to a no-op (the Kafka
consumers swallow send failures, and the in-app notification is persisted
first). Create the Secret to enable real email:

```bash
kubectl create secret generic notification-mailtrap-secret \
  --namespace=unigevents \
  --from-literal=username='PASTE_MAILTRAP_USERNAME' \
  --from-literal=password='PASTE_MAILTRAP_PASSWORD'
kubectl rollout restart deployment/notification-service -n unigevents
```

Grab the credentials from the Mailtrap sandbox inbox (Email Testing → SMTP
Settings). Host/port default to `sandbox.smtp.mailtrap.io:2525`.

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

## OpenAI API key — moderation-service (one-time, manual — not committed)

`moderation-service` calls the OpenAI moderation API. `OpenAiModerationHeadersFactory`
reads `openai.api.key` (env `OPENAI_API_KEY`); the app **fails to start** if it is empty
— there is no committed fallback (PINFO-211 fail-fast), so a missing value means
`CrashLoopBackOff`, not a degraded boot. The Deployment injects it from a Secret named
`openai-secret` (key `api-key`). The prod cluster does **not** read Doppler, so this
Secret must exist before deploying. Create it once with the value from Doppler
(`unigevents` → `prd` → `OPENAI_API_KEY`) or the OpenAI dashboard:

```bash
kubectl create secret generic openai-secret \
  --namespace=unigevents \
  --from-literal=api-key='PASTE_OPENAI_API_KEY'
```

To **rotate** the key (after issuing a new one on OpenAI):

```bash
kubectl delete secret openai-secret -n unigevents
kubectl create secret generic openai-secret \
  --namespace=unigevents \
  --from-literal=api-key='PASTE_NEW_KEY'
kubectl rollout restart deployment/moderation-service -n unigevents
```

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

# Kafka broker for async event bus (PINFO-202). Only event-service and
# registration-service talk to it; the other 4 backends are unaffected.
kubectl apply -f k8s/kafka/

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

There are two distinct entry points — keep them straight:

**Public (the only one end users see)** — HTTPS on the Cloudflare-issued
URL configured in the Cloudflare Tunnel dashboard. TLS terminates on
Cloudflare's edge (port 443), then traffic is forwarded over the
outbound tunnel to the in-cluster Ingress on port 80.

```bash
# Replace <your-cloudflare-url> with the public hostname of the tunnel
curl -I https://<your-cloudflare-url>/                # expect 200 (frontend)
curl -i https://<your-cloudflare-url>/api/users/me    # expect 401 (Kong enforcing JWT)
```

**VPN-only (operator debug, never given to end users)** — once the
Ingress has an address (give it ~30 s after the first `apply`), the
app is also reachable over plain HTTP on the VM's IP from any machine
on the UNIGE VPN. This bypasses Cloudflare and is only useful for
isolating "is the cluster healthy?" from "is Cloudflare healthy?".

```bash
# Check that the Ingress got an address
kubectl get ingress -n unigevents

# Frontend (SPA) — VPN-only
curl -I http://10.25.10.131/

# Backend via Kong — expect HTTP 401 (no JWT) on a protected route
curl -i http://10.25.10.131/api/users/me
```

> **TLS is terminated upstream by Cloudflare**, not at the Ingress. The
> in-cluster Ingress only listens on port 80. Plain HTTP on the VM's IP
> is reachable only from inside the UNIGE VPN and is **not** meant for
> end users — it has no certificate and no public DNS A-record.
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
# All 16 pods should reach Running / Ready = 1/1
#   6 app pods + 6 DB pods + 1 Kafka + 1 Kong + 1 frontend + 1 cloudflared
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

1. Builds the 7 Docker images (6 backend services + frontend) and pushes them to `ghcr.io` with **two tags**: the full commit SHA (`ghcr.io/.../user-service:<sha>`) and `:latest`.
2. On a **self-hosted GitHub Actions runner** running on the prod VM itself (`pinfo1`), calls `kubectl set image deployment/<svc> <svc>=ghcr.io/.../<svc>:<sha>` on the 7 Deployments — pinning each to the just-built commit SHA.
3. Waits for each rollout to reach `Available` (timeout: 180 s/service).
4. Smoke-tests `/q/health/ready` on each Quarkus service from inside its own pod via `kubectl exec`. A flapping service (passes the readiness probe once then 500s) trips the CD here.
5. On any failure, prints the rollback command in the GitHub Actions summary.

No manual action is needed after a merge. Check Actions tab on GitHub — the `Rollout new images on microk8s` job should succeed a few minutes after the image builds finish.

### Rollback procedure (PINFO-178)

Because we now pin Deployments to a SHA (not `:latest`), `kubectl rollout undo` actually works:

```bash
# Undo a single service
microk8s kubectl rollout undo deployment/user-service -n unigevents

# Undo every app Deployment (use only after a confirmed-bad CD run)
for d in user-service event-service registration-service \
         notification-service moderation-service search-service \
         frontend; do
  microk8s kubectl rollout undo deployment/$d -n unigevents
done
```

Since PINFO-196, the manifests in `k8s/` reference `:replaced-by-cd` (a non-existent tag) for our 7 ghcr images, so a stray `kubectl apply` between CD runs lands the pods in `ErrImagePull` until you re-run CD or manually `kubectl set image`. That is the intended behavior: a manual apply that silently rolled out stale `:latest` was the failure mode this protects against. To re-apply manifests safely, re-run CD afterwards (push an empty commit or click *Re-run jobs*).

### Bootstrapping a fresh cluster (PINFO-196)

Because the manifests no longer carry runnable image tags for the 7 ghcr images, the very first deploy on an empty cluster needs the SHA pinning step that CD usually does. Two ways:

1. Easiest — push any commit to `develop` (or click *Re-run* on the latest `CD Pipeline` workflow). CD will create the Deployments in their `ErrImagePull` state and then immediately `set image` them to the commit SHA.
2. Manual — apply the manifests then run the same `set image` loop CD does:
   ```bash
   microk8s kubectl apply -f k8s/ -R
   SHA=$(git rev-parse HEAD)
   for d in user-service event-service registration-service \
            notification-service moderation-service search-service \
            frontend; do
     microk8s kubectl set image -n unigevents deployment/$d \
       $d=ghcr.io/machanier/pinfo-2026-team1/$d:$SHA
   done
   ```

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

A daily `CronJob` named `postgres-backup` runs `pg_dumpall` against each of the 6 microservice Postgres servers, gzips the result, **encrypts it with GPG (AES256, symmetric, since PINFO-192)**, and stores it on a shared `postgres-backups` PVC. Retention is 7 days — older dumps are deleted automatically at the end of each run.

**Schedule:** `02:00 Europe/Zurich` every day. The schedule is anchored on local time via `spec.timeZone`, so the cron fires at the same wall-clock time across DST switches.

**On-disk layout** (inside the PVC, mounted at `/backups` in the Job pod):

```
/backups/
├── user-db/
│   ├── 2026-04-23.sql.gz.gpg
│   ├── 2026-04-24.sql.gz.gpg
│   └── 2026-04-25.sql.gz.gpg
├── event-db/
└── ... (one folder per service)
```

#### Postgres backup encryption key (one-time, manual — not committed)

The CronJob refuses to run unless a Secret named `postgres-backup-gpg-passphrase` exists in the namespace. Create it once, before the first scheduled run:

```bash
# Generate a long random passphrase, store it in the cluster, AND
# print it to stdout so you can save it in a password manager —
# without it the dumps are unrecoverable.
PASS=$(openssl rand -base64 48)
echo "Backup passphrase: $PASS"
echo "  ⚠  Save this in 1Password / Bitwarden NOW. Losing it makes every"
echo "     dump on the PVC permanently unreadable."

kubectl create secret generic postgres-backup-gpg-passphrase \
  --namespace=unigevents \
  --from-literal=passphrase="$PASS"
unset PASS
```

To **rotate** the passphrase (e.g. on suspicion of leak): create a new secret value with the same name (`kubectl delete secret` then re-create as above), and start a fresh dump (`kubectl create job --from=cronjob/postgres-backup …`). Old dumps stay encrypted with the old passphrase — keep the previous value archived for as long as those dumps are useful, then let retention expire them.

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

**Restore a database from a dump:** the dumps are produced with `--clean --if-exists`, meaning replaying them DROPS the existing schemas and recreates everything. Do this with extreme caution. Since PINFO-192 the file on disk is `*.sql.gz.gpg` and you need the passphrase from the `postgres-backup-gpg-passphrase` Secret to decrypt it.

The simplest path is to do the decryption on your laptop:

```bash
# 1. Pick the dump and copy it locally.
DUMP=2026-04-25.sql.gz.gpg
DB=user-db
microk8s kubectl cp -n unigevents \
  $(microk8s kubectl get pod -n unigevents -l app=postgres-backup -o name | head -1):/backups/${DB}/${DUMP} \
  ./${DUMP}
# (or copy from the host directly:
#   /var/snap/microk8s/common/default-storage/unigevents-postgres-backups-*/${DB}/${DUMP} )

# 2. Read the passphrase out of the cluster.
PASS=$(microk8s kubectl get secret postgres-backup-gpg-passphrase \
  -n unigevents -o jsonpath='{.data.passphrase}' | base64 -d)

# 3. Decrypt + gunzip, then restore.
gpg --batch --pinentry-mode loopback --passphrase "$PASS" \
    --decrypt "$DUMP" | gunzip > restore.sql
unset PASS

# 4. Replay against a port-forwarded DB.
microk8s kubectl port-forward -n unigevents svc/${DB} 5432:5432 &
psql -h localhost -U <db_user> < restore.sql
```

Alternative all-in-cluster: spin up an ephemeral pod that mounts both the PVC and the GPG passphrase Secret, and pipes `gpg | gunzip | psql` end-to-end. Long but doable — see git history of this README for the full one-liner if you need it.

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
kubectl delete -f k8s/kafka/
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
