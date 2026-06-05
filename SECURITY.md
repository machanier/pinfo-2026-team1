# Security

This document summarises the security posture of **UNIGEvents** (Team 1, UNIGE
Software Engineering 2026). The application is a graded course project deployed to
a single-node microk8s cluster (`pinfo1`) on the **private UNIGE network**, fronted
by a **Cloudflare Tunnel** — there is no real production data and no external user
base. Severities are framed with that scope in mind.

## Network exposure

- **Single public entry point.** End users reach the app only over HTTPS through the
  Cloudflare Tunnel → in-cluster nginx-ingress (port 80). TLS terminates at
  Cloudflare's edge.
- **No direct service exposure.** Every Kubernetes Service is `ClusterIP` (or
  headless) — there are **no `NodePort` or `LoadBalancer` services**. The node has no
  public IP (private `10.x` address, reachable only from the UNIGE network).
- **Node metrics surface locked down.** The cluster's unauthenticated `/metrics`
  endpoints — Prometheus `node-exporter` (`:9100`), `kube-controller-manager`
  (`:10257`), `kube-scheduler` (`:10259`), the nginx-ingress controller (`:10254`),
  and the microk8s `cluster-agent` (`:25000`) — are **not reachable from the
  network**: `node-exporter` runs without `hostNetwork`, and a host firewall on
  `pinfo1` restricts the remaining ports to loopback + the pod CIDR, so Prometheus
  still scrapes them internally. (See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md#observability-prometheus--grafana).)
- **kubelet & API server require authentication** (anonymous access returns `401`);
  the kubelet read-only port and the datastore (dqlite/etcd) are not exposed.

## Workload hardening

Every workload in the `unigevents` namespace runs **non-root** with a locked-down
`securityContext`:

- `runAsNonRoot: true` with an explicit non-root UID (Postgres as UID 70, the
  application services as 1000).
- `allowPrivilegeEscalation: false` and **all Linux capabilities dropped**
  (`capabilities.drop: ["ALL"]`).
- `seccompProfile: RuntimeDefault`.
- `automountServiceAccountToken: false` on every pod (none call the Kubernetes API).
- CPU/memory **requests and limits** on every container.

No pod is `privileged`. The only `hostNetwork` pod is `cloudflared` — an
outbound-only tunnel with its service-account token stripped and all capabilities
dropped.

## Network policies

The namespace enforces a **default-deny** policy (ingress *and* egress) with an
explicit per-tier allowlist: ingress controller → Kong → backends → databases, plus
DNS, Auth0 JWKS over 443, and the Kafka broker. See
[`k8s/network-policies/`](./k8s/network-policies/).

## Secrets

- **No secret is committed to Git.** All credentials live in Kubernetes `Secret`
  objects created out-of-band, and in **Doppler** for local/CI. Database passwords,
  the Auth0 client secret, the Cloudinary/OpenAI keys, the Cloudflare tunnel token,
  and the backup GPG passphrase are all injected via `secretKeyRef`.
- Secret scanning runs in CI (**gitleaks**), mirrored by a local pre-commit hook.
- The Grafana admin credentials were rotated off the monitoring-addon default.

## Supply chain & CI/CD

- **Container images are pinned by digest** (`@sha256:…`) for every production image.
- **GitHub Actions are pinned by commit SHA**; workflow `permissions:` follow least
  privilege; there is no `pull_request_target` and no untrusted fork code runs on the
  self-hosted runner (deploys trigger on `push` to `develop` only).
- **Trivy** scans images in CI and gates on `CRITICAL` findings; **SonarCloud** runs
  on every pull request (quality gate, including the vulnerabilities metric).

## Authentication & API gateway

- All API traffic goes through **Kong**, which validates **Auth0 JWTs**; Kong's Admin
  API is **disabled** (`KONG_ADMIN_LISTEN: off`). The only deliberately public route
  is the event listing/detail `GET` endpoint; the backend re-checks authorization
  (`@RolesAllowed`) as a second layer.

## Data at rest

- Nightly Postgres backups are **GPG-encrypted (AES-256)** before they are written to
  the volume; the passphrase is a Kubernetes Secret.

## Reporting

This repository is coursework, so there is no formal disclosure process. Direct
security questions to the team's DevOps maintainer (see the [README](./README.md#team)).
