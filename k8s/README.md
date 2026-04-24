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
└── ingress/
    └── unigevents-ingress.yaml       # /api → kong-proxy, / → frontend (HTTP only, no TLS yet)
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

> **No TLS yet.** We only have the VM's IP, no public DNS name, so
> Let's Encrypt cannot issue a certificate. Once a domain is available,
> install `cert-manager`, add a `ClusterIssuer`, and extend the Ingress
> with a `tls:` block + a `host:` on each rule.

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
# All 12 pods (6 apps + 6 DBs) should reach Running / Ready = 1/1
kubectl get pods -n unigevents -w

# Logs for a specific service
kubectl logs -n unigevents deploy/user-service --tail=50 -f
kubectl logs -n unigevents statefulset/user-db --tail=50

# Resource usage (needs metrics-server)
kubectl top pods -n unigevents

# In-cluster DNS check (from a throwaway pod)
kubectl run curltest --rm -it --image=curlimages/curl --restart=Never -n unigevents \
  -- curl -v http://user-service:8081/q/health 2>&1 || true
```

### Cold-start note

Quarkus in JVM mode takes 30–60 s to open its HTTP port on a cold boot, especially when 6 services start in parallel on a 2-CPU node. Readiness/liveness probes are configured with `initialDelaySeconds: 40` / `90` to tolerate this. Expect the first rollout to take a few minutes before everything is `1/1`.

## Teardown (destructive)

```bash
# Remove app workloads but keep the namespace and secrets
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
- `imagePullPolicy: Always` ensures new `:latest` builds are picked up on pod restart — acceptable for this project; a production-grade setup would use immutable `:<sha>` tags.
- Postgres DBs use a `StatefulSet` with `volumeClaimTemplates` (1 Gi / service on `microk8s-hostpath`) so data survives pod restarts.
- App ↔ DB authentication uses a per-service `<svc>-db-secret` with `username` + `password` keys, referenced by both the StatefulSet (to initialize the Postgres user) and the Deployment (to connect).
