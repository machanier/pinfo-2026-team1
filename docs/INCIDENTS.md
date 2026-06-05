# Incident response runbook — UNIGEvents

This document is what you read **first** when something looks broken in production. It assumes you have:

- VPN access to UNIGE (`10.25.10.131`)
- SSH access to the prod VM (`pinfo1`)
- `microk8s kubectl` available on `pinfo1`
- Read access to the GitHub repo and Actions tab
- Write access to the `develop` branch (for hot-fix merges)

If you're missing any of those, escalate to the DevOps lead before touching anything.

---

## 0. The 30-second triage

Before drilling into a service, check the global state:

```bash
ssh pinfo1
microk8s kubectl get pods -n unigevents -o wide
microk8s kubectl get deploy -n unigevents
microk8s kubectl get ingress -n unigevents
```

Sanity questions, in order:

1. **Are pods `Ready`?** (`READY 1/1`, `STATUS Running`)
2. **Are the Deployments at full availability?** (`AVAILABLE = DESIRED`)
3. **Does the Ingress have an `ADDRESS`?**
4. **Is Cloudflare reaching the tunnel?** (https://unigevents.ch should respond at all — even a 502 means the tunnel is up but the upstream is down, which is a different bug than a tunnel outage.)

If everything above is green and the user-reported symptom persists, the bug is application-level (logic / DB data) — open a regular ticket, not an incident.

---

## 1. Decision tree

```
                    User-reported issue
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    Site fully unreachable        Specific feature broken
    (browser timeout)             (some pages / endpoints fail)
              │                         │
              ▼                         ▼
    → §2 Tunnel / Ingress        → §3 Single service down
                                  → §4 Database down
                                  → §5 5xx after CD push
                                  → §6 5xx without CD push
```

---

## 2. Site fully unreachable

**Symptom**: `unigevents.ch` times out or returns Cloudflare error 522/523.

### Check the tunnel

```bash
microk8s kubectl get pods -n unigevents -l app=cloudflared
microk8s kubectl logs -n unigevents -l app=cloudflared --tail=100
```

Healthy logs contain `Registered tunnel connection` lines. If the pod is `CrashLoopBackOff`, the most common cause is an invalid `cloudflared-token` Secret — see `k8s/README.md > Cloudflared tunnel token > To rotate the token`.

### Check the Ingress

```bash
microk8s kubectl get ingress -n unigevents
microk8s kubectl describe ingress unigevents-ingress -n unigevents
```

If `ADDRESS` is empty, the ingress controller is sick:

```bash
microk8s kubectl get pods -n ingress
microk8s kubectl logs -n ingress -l name=nginx-ingress-microk8s
microk8s status               # ingress addon must be enabled
```

### Last resort

Restart the tunnel:

```bash
microk8s kubectl rollout restart deployment/cloudflared -n unigevents
microk8s kubectl rollout status deployment/cloudflared -n unigevents --timeout=60s
```

Restart the ingress controller (very rare):

```bash
microk8s kubectl rollout restart -n ingress daemonset/nginx-ingress-microk8s-controller
```

---

## 3. Single backend service unreachable

**Symptom**: One feature works (e.g. browsing events) but another fails with HTTP 502/503 (e.g. login).

### Identify the failing service

| Feature broken | Service | Port |
| --- | --- | --- |
| Login, profile, role check | `user-service` | 8081 |
| Event listing / detail | `event-service` | 8082 |
| Email/push notifications | `notification-service` | 8083 |
| Comment moderation | `moderation-service` | 8084 |
| Search bar | `search-service` | 8085 |
| Event registration / unregister | `registration-service` | 8086 |

### Check the pod

```bash
SVC=user-service     # ← change me
microk8s kubectl get pods -n unigevents -l app=$SVC
microk8s kubectl describe pod -n unigevents -l app=$SVC | tail -50
microk8s kubectl logs -n unigevents -l app=$SVC --tail=200
```

Look at the bottom of `describe` (Events) for `Liveness probe failed`, `OOMKilled`, `BackOff pulling image`, etc.

### Common patterns

| Symptom in `describe` / `logs` | Cause | Fix |
| --- | --- | --- |
| `OOMKilled` | Heap exceeded `resources.limits.memory` (512 Mi) | Bump the limit in `k8s/<svc>/<svc>-deployment.yaml`, merge, let CD redeploy. If urgent, `kubectl edit deploy/<svc> -n unigevents` and bump in place — but **then** open the PR, otherwise the change vanishes on the next CD run. |
| `Readiness probe failed: HTTP 503` | App started but Hibernate / DB connection broken | Go to §4 (database down). |
| `Readiness probe failed: connection refused` | App not booted yet | Wait 60 s. If it doesn't recover, check logs for a startup exception. |
| `Back-off pulling image` | GHCR rate-limit or image not pushed | Re-run the failed CD job. |
| `CrashLoopBackOff` + `Caused by: org.flywaydb.core...` | Bad DB migration | Roll back: `microk8s kubectl rollout undo deployment/$SVC -n unigevents`. Open a fix PR. |
| Logs show 100% requests = 401 | JWT issuer mismatch (Auth0 config drift) | Verify `mp.jwt.verify.issuer` in `application.properties` matches the Auth0 tenant URL. |

### Hit the health endpoint directly

PINFO-177 added `/q/health/{live,ready}` and `/q/metrics` to every service:

```bash
microk8s kubectl exec -n unigevents deploy/$SVC -- curl -s localhost:8081/q/health/ready
microk8s kubectl exec -n unigevents deploy/$SVC -- curl -s localhost:8081/q/health
```

`status: UP` everywhere = the app is fine, the bug is upstream (Kong, Ingress, Cloudflare). `status: DOWN` on a `database` check = §4.

---

## 4. Database down for one service

Each service has its own Postgres StatefulSet (`<svc>-db`). They share a node but not a database.

```bash
DB=user-db           # ← change me
microk8s kubectl get pods -n unigevents -l app=$DB
microk8s kubectl logs -n unigevents -l app=$DB --tail=100
microk8s kubectl exec -n unigevents $DB-0 -- pg_isready -U postgres
```

### Common patterns

| Symptom | Cause | Fix |
| --- | --- | --- |
| Pod `CrashLoopBackOff`, log `database files are incompatible with server` | Postgres major-version bump in the StatefulSet | Roll back the image tag in `k8s/<svc>/<svc>-db-statefulset.yaml`, OR `pg_dumpall` from the latest backup and restore into a fresh PVC. **Do not** delete the PVC blindly — see backups below. |
| Pod `Pending`, `0/1 nodes available: insufficient storage` | hostpath PVC ran out of disk on the node | `df -h /var/snap/microk8s/common/default-storage` on `pinfo1`. If full, free space (logs / old images) before bringing the pod back. |
| App logs `connection refused` but DB pod is `Running` | NetworkPolicy or wrong service DNS | `microk8s kubectl exec -n unigevents deploy/$SVC -- nc -vz $DB 5432`. Should connect. If not, check the `Service` selector matches the StatefulSet labels. |

### Restoring from backup

Backups are dumped nightly @ 02:00 Europe/Zurich to PVC `postgres-backups`. To list and restore:

```bash
# List recent backups (newest first)
microk8s kubectl run -it --rm --restart=Never \
  -n unigevents pg-restore-shell --image=postgres:16 \
  --overrides='{"spec":{"volumes":[{"name":"backups","persistentVolumeClaim":{"claimName":"postgres-backups"}}],"containers":[{"name":"pg-restore-shell","image":"postgres:16","command":["sh"],"stdin":true,"tty":true,"volumeMounts":[{"name":"backups","mountPath":"/backups"}]}]}}'

# Inside the shell:
ls -lh /backups | tail -10
# pg_restore steps depend on which DB you're restoring; consult docs/DEPLOYMENT.md
```

Document the restore in the postmortem (§9): timestamp picked, data lost between that snapshot and the incident.

---

## 5. 5xx errors right after a CD push

**Symptom**: Site was healthy 10 min ago. A merge to `develop` landed. Now requests are failing.

### One-shot rollback (PINFO-178)

Since PINFO-178 we pin Deployments to the commit SHA, so `kubectl rollout undo` actually reverts the running code:

```bash
ssh pinfo1

# Roll back ONE service (preferred — minimum blast radius)
microk8s kubectl rollout undo deployment/<svc> -n unigevents
microk8s kubectl rollout status deployment/<svc> -n unigevents --timeout=120s

# Or roll back ALL of them (after a confirmed-bad multi-service deploy)
for d in user-service event-service registration-service \
         notification-service moderation-service search-service frontend; do
  microk8s kubectl rollout undo deployment/$d -n unigevents
done
```

The cluster is now back on the **previous** SHA. The bad commit is still on `develop` — you must **also** revert it on GitHub:

```bash
gh pr create --base develop --head revert-<sha> \
  --title "Revert: <bad commit subject>" \
  --body "Reverts <sha>. Deployed via rollout undo at <timestamp>."
```

…otherwise the next CD run will redeploy the broken code.

### Trap

`kubectl apply -f k8s/<svc>/<svc>-deployment.yaml` between two CD runs overwrites the SHA pin with `:latest` and breaks `rollout undo` until the next CD push restores the SHA. See `k8s/README.md > Rollback procedure`.

---

## 6. 5xx errors without a recent CD push

If no merge happened recently, the cause is environmental:

1. **Resource starvation on the node** — `htop` over SSH; check `microk8s kubectl top nodes` and `microk8s kubectl top pods -n unigevents`.
2. **Disk full** — `df -h` on `pinfo1`. The hostpath storage is on `/var/snap/microk8s/common/default-storage`.
3. **Auth0 outage** — every protected request 401? Check https://status.auth0.com.
4. **Kong config drift** — was `k8s/kong/kong-configmap.yaml` edited and applied without restarting Kong? See `k8s/README.md > When Kong config changes`.
5. **Schema / column-type drift** — a single endpoint 500s with `SQLGrammarException` / `operator does not exist: <type> = <type>`, while the pod stays `Ready`. `quarkus.hibernate-orm.database.generation=update` silently skips *incompatible* column-type changes (e.g. `varchar → uuid`), so the JPA entity and the live table disagree. See the worked example below.

### Worked example — registration 500 on every inscription (2026-06-04)

**Symptom**: `POST /api/registrations` and `GET /api/registrations/me` returned **500 for every event**; the UI showed the generic "Impossible de vous inscrire à cet événement." No CD push had happened and `registration-service` was `Ready 1/1` (so it was *not* §3/§5).

**Diagnosis** — the stack trace names the exact SQL:
```bash
microk8s kubectl logs deployment/registration-service -n unigevents --since=10m \
  | grep -A20 -iE "ERROR|Exception"
# → SQLGrammarException: operator does not exist: character varying = uuid
#   [select ... from registrations r1_0 where r1_0.studentId=?]
# and, earlier, at boot:
#   GenerationTarget ... "alter table ... alter column studentId set data type uuid"
#   → column "studentid" cannot be cast automatically to type uuid
```

**Root cause**: the `registrations` table was first created when the `Registration` entity used `String studentId`, so the column was `character varying`. The entity later became `UUID studentId` (= `nameUUIDFromBytes(auth0 sub)`), but `generation=update` cannot auto-cast `varchar → uuid` (Postgres needs an explicit `USING …::uuid`). Hibernate logged the failed `ALTER` as a WARN and kept the stale column; every `WHERE studentId = ?` then compared `varchar = uuid` → 500. The pod stayed `Ready` because the readiness probe is only `SELECT 1`, which never touches the table.

**Fix** (no code change — the entity is correct; only the DB was stale):
```bash
# 1. Inspect column types + row count first
microk8s kubectl exec -n unigevents registration-db-0 -- \
  psql -U registration_service -d registrations_db -c '\d registrations'
microk8s kubectl exec -n unigevents registration-db-0 -- \
  psql -U registration_service -d registrations_db -c 'SELECT count(*) FROM registrations;'

# 2a. No data worth keeping → drop and let Hibernate recreate it correctly:
microk8s kubectl exec -n unigevents registration-db-0 -- \
  psql -U registration_service -d registrations_db -c 'DROP TABLE registrations;'
microk8s kubectl rollout restart deployment/registration-service -n unigevents

# 2b. To preserve rows instead, migrate the column type explicitly (values are
#     valid UUID strings, so the cast succeeds):
#   ALTER TABLE registrations ALTER COLUMN studentid TYPE uuid USING studentid::uuid;
```

**Prevention**: `generation=update` never performs incompatible type changes. After any entity column-type change, start from a clean DB or run the `ALTER … USING` by hand — or adopt a real migration tool (Flyway) so the change is deterministic.

---

## 7. Self-hosted GHA runner offline

**Symptom**: Builds finish, but the `Rollout new images on microk8s` job is stuck `queued`.

```bash
ssh pinfo1
sudo systemctl status 'actions.runner.*'
# If down:
sudo systemctl restart 'actions.runner.*'
```

GitHub side: *Settings → Actions → Runners*. The `pinfo1` runner must show 🟢 `Idle`. If it's stuck `Offline` after a restart, see `k8s/README.md > Self-hosted runner — runbook`.

---

## 8. Observability quick links

While diagnosing, open these:

```bash
grafana-on             # SSH-tunnels Grafana to localhost:3000
```

Useful dashboards once `grafana-on` is up:

- **Kubernetes / Compute Resources / Namespace (Pods)** — CPU/mem per pod in `unigevents`.
- **Kubernetes / Compute Resources / Pod** — drill into one pod.
- **Node Exporter / Nodes** — disk, network on `pinfo1`.

Prometheus targets (sanity check that Prometheus actually reaches our services after PINFO-177):

```bash
microk8s kubectl -n observability port-forward svc/kube-prom-stack-kube-prome-prometheus 9090:9090
# → http://localhost:9090/targets — every Quarkus service should be UP
```

---

## 9. Postmortem template

Within 48 h of any incident that caused user-visible downtime, write a postmortem in `docs/postmortems/YYYY-MM-DD-short-title.md` using this template:

```markdown
# Postmortem — <short title>

**Date**: YYYY-MM-DD
**Duration**: HH:MM → HH:MM (Europe/Zurich), N minutes total
**Severity**: SEV-1 (full outage) / SEV-2 (degraded) / SEV-3 (single feature)
**Author**: <name>

## Summary
<2-3 sentences a non-engineer can read>

## Impact
- Users affected: <estimate>
- Data lost: <yes/no, if yes from when to when>
- External dependencies broken (Auth0, Cloudflare, …): <list>

## Timeline (Europe/Zurich)
- HH:MM — <event>
- HH:MM — <event>
- ...

## Root cause
<technical>

## Detection
- How was it detected? (user report / alert / accidentally)
- Time-to-detect: N min
- What signal caught it (or should have)?

## Resolution
<exact commands run, exact PRs merged>

## What went well
- ...

## What went poorly
- ...

## Action items
- [ ] <action> — <owner> — <due date> — <Jira ID>
- [ ] ...
```

Action items must be Jira-tracked, not just bullet points. The runbook (this file) is updated as part of the action items if a known scenario was missing or wrong.

---

## 10. Contacts

| Role | Name | Reach |
| --- | --- | --- |
| Project lead | Thérèse Arousell | [@tharsll](https://github.com/tharsll) |
| DevOps lead | Maxence Chanier | [@machanier](https://github.com/machanier) |
| Backend | Iris Riedo · Mathéo Gobillot | [@iriried](https://github.com/iriried) · [@MGobillot3](https://github.com/MGobillot3) |
| Frontend | Gabin Prunet | [@LeGabs](https://github.com/LeGabs) |
| Auth0 tenant owner | Team (shared free dev tenant) | [@machanier](https://github.com/machanier) |
| UNIGE infra (VM host) & Cloudflare `p-info.net` zone | Course professor (UNIGE) | Owned by the course staff — out of the team's direct control |

> This is a UNIGE course project: there is no formal 24/7 on-call. The team coordinates via GitHub and the course channel; the Cloudflare zone and VM host are owned by the course professor.
