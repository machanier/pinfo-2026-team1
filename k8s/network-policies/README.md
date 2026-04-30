# NetworkPolicies (PINFO-187)

Default-deny baseline + named allowlist for the `unigevents` namespace.
Without these, **any compromised pod can reach every other pod and every
database in the namespace** — there is no segmentation in microk8s by
default.

## Pre-requisite

The microk8s CNI must enforce NetworkPolicy. With the default `calico`
plugin (microk8s 1.19+) this is the case out of the box. To verify on
the prod VM:

```sh
microk8s kubectl get pods -n kube-system -l k8s-app=calico-node
```

If those pods are running, NetworkPolicy is enforced. If you switched
the CNI to `flannel` (which does NOT enforce NetworkPolicy), apply
these manifests is a no-op — they install but nothing rejects traffic.

## Files

| File | Purpose |
|------|---------|
| `00-default-deny.yaml` | Block all ingress + egress in `unigevents`. |
| `10-allow-dns.yaml` | Egress UDP/TCP 53 to kube-system (coredns). |
| `11-allow-egress-https.yaml` | Egress TCP 443 to non-private IPs (Auth0 JWKS, SaaS). |
| `20-kong.yaml` | Ingress from `ingress` ns, egress to the 6 backends. |
| `30-frontend.yaml` | Ingress from `ingress` ns. |
| `40-backends.yaml` | Ingress from Kong, peers, observability. Egress to DBs + peers. |
| `50-databases.yaml` | Ingress from backends + postgres-backup, port 5432 only. |
| `60-postgres-backup.yaml` | Egress to DBs, no ingress. |

The numeric prefix is for human readability only; K8s reconciles all
policies together. Adding or removing one file changes the effective
allowlist immediately on the next reconciliation.

## Apply / verify / rollback

The CD workflow already runs `kubectl apply -f k8s/ -R`, which picks up
this directory automatically. To exercise it manually on pinfo1:

```sh
microk8s kubectl apply -f k8s/network-policies/ -n unigevents
microk8s kubectl get netpol -n unigevents
```

Quick sanity check that the public path still works after apply:

```sh
curl -I https://<your-domain>/api/users/health   # via Kong
curl -I https://<your-domain>/                   # via frontend
```

If anything breaks (typical symptoms: timeouts on `kubectl logs` for a
backend that can't reach its DB, or 502 from Kong), roll back with:

```sh
microk8s kubectl delete netpol --all -n unigevents
```

That removes the deny baseline and restores the previous open behavior
in seconds. Then investigate which allow rule was missing before re-applying.

## Pods that NetworkPolicy cannot constrain

`cloudflared` runs with `hostNetwork: true` and shares the node's
network namespace. NetworkPolicy is enforced on the cluster pod
network, so policies don't apply to it. This is fine: cloudflared only
opens an outbound tunnel to the Cloudflare edge plus an HTTP loopback
to the node's nginx-ingress on `localhost:80`, neither of which we
would block.

## Adding a new service

1. Add its label to the `In` list on `40-backends.yaml` (ingress, egress, peer-egress) and on `50-databases.yaml` (so its DB pod accepts traffic from it).
2. If it listens on a new port, add the port to Kong's egress in `20-kong.yaml`.
3. Re-apply.

## Out of scope (for follow-ups)

- **Egress to specific Auth0 domains only**: today we open TCP 443 to
  the entire public internet. Pinning to `auth0.com` / `*.auth0.com`
  CIDR-by-CIDR is brittle (the IPs rotate), so the right move is an
  egress proxy (e.g. tinyproxy or a sidecar) once we have one in the
  cluster.
- **Cilium L7 policies**: would let us restrict by HTTP path
  (e.g. only Kong → backend on `/api/*`, never `/internal/*`). microk8s
  ships Calico by default; switching to Cilium is a separate ticket.
