# Kubernetes manifests — UNIGEvents prod (microk8s)

This directory contains the Kubernetes manifests used to deploy UNIGEvents to the production microk8s cluster (`pinfo1`).

## Layout

```
k8s/idempotent
├── namespace.yaml              # unigevents namespace
└── user-service/               # pilot service — pattern to duplicate for the 5 others
    ├── user-db-statefulset.yaml
    ├── user-db-service.yaml
    ├── user-service-deployment.yaml
    └── user-service-service.yaml
```

## Prerequisites (one-time cluster setup)

Already done under PINFO-133 — kept here as a reference:

- microk8s addons: `dns`, `ingress`, `hostpath-storage`, `metrics-server`
- Namespace `unigevents` created
- Image pull secret `ghcr-pull-secret` (type `dockerconfigjson`) created in namespace `unigevents` with a GitHub PAT scoped to `read:packages`

## Per-service secrets (one-time per cluster, manual — not committed)

Database credentials are stored in Kubernetes Secrets that are **never committed to Git**. Create them with `kubectl` before the first `apply`:

```bash
# Generate a strong password (or pick your own)
USER_DB_PASSWORD=$(openssl rand -base64 24)

kubectl create secret generic user-db-secret \
  --namespace=unigevents \
  --from-literal=username=user_service \
  --from-literal=password="$USER_DB_PASSWORD"

# Verify (type only, never use -o yaml on credential secrets)
kubectl get secret user-db-secret -n unigevents
```

### Already exists? That's expected.

`kubectl create secret` is **intentionally not idempotent**. If you get `Error from server (AlreadyExists)`, the secret is already in the cluster — **do not re-create it**. You have nothing to do, continue to the next step.

If you ever need to read back an existing password (e.g. to `psql` into the database):

```bash
kubectl get secret user-db-secret -n unigevents \
  -o jsonpath='{.data.password}' | base64 -d
```

To **rotate** the password (rare, destructive — breaks existing DB auth until the user is `ALTER`ed or the PVC is wiped):

```bash
kubectl delete secret user-db-secret -n unigevents
# ... then re-run the create command above with a new password
```

## Deploy

From the repo root:

```bash
# Namespace (idempotent — safe to re-run)
kubectl apply -f k8s/namespace.yaml

# user-service pilot
kubectl apply -f k8s/user-service/
```

## Verify

```bash
# Pods should reach Running / Ready = 1/1
kubectl get pods -n unigevents -w

# Logs
kubectl logs -n unigevents deploy/user-service --tail=50 -f
kubectl logs -n unigevents statefulset/user-db --tail=50

# Service connectivity (in-cluster DNS)
kubectl run curltest --rm -it --image=curlimages/curl --restart=Never -n unigevents \
  -- curl -v http://user-service:8081/q/health 2>&1 || true
```

## Teardown (destructive)

```bash
kubectl delete -f k8s/user-service/
# Namespace teardown also deletes every resource inside it
kubectl delete namespace unigevents
```

## Conventions

- Every resource has `app.kubernetes.io/part-of: unigevents` for filtering.
- Service names match the in-cluster DNS expected by the application (`user-db` resolves to the Postgres service).
- Deployments pull images from `ghcr.io/machanier/pinfo-2026-team1/<service>:latest`.
- `imagePullPolicy: Always` ensures new `:latest` builds are picked up on pod restart — acceptable for this project; a production-grade setup would use immutable `:<sha>` tags.
