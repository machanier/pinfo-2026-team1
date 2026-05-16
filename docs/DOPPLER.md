# Doppler — Secret Management

Doppler is the team's shared secret manager (cloud-hosted). It replaces ad-hoc `.env` files passed around in Discord and centralises secret injection for local dev, CI/CD, and (eventually) prod.

Project name in Doppler: **`unigevents`**.

---

## 1. Configs

Three environment configs, mirroring the standard dev/stg/prd split:

| Config | Used for | Wired today |
|---|---|---|
| `dev` | Local development — `make dev-*`, `npm run dev` | ✅ Active. Doppler→GitHub sync also feeds CI/CD build secrets from this config. |
| `stg` | Staging deployment | ⏳ Reserved. No staging cluster yet. |
| `prd` | Production microk8s on pinfo1 | ✅ Populated as a backup of the cluster's k8s Secrets. Not yet injected into the cluster (k8s Secrets remain the runtime source of truth — see [§5](#5-the-prd-config-and-the-vm)). |

The repo-level `doppler.yaml` pins `setup: { project: unigevents, config: dev }`, so `doppler setup` from anywhere in the repo auto-selects the `dev` config.

---

## 2. Secret inventory

### Frontend (consumed by Vite at build time, then baked into the SPA bundle)

| Name | Public? | Origin |
|---|---|---|
| `VITE_API_URL` | yes | Dev: `http://localhost:8081`. Prod: `https://unigevents.ch` |
| `VITE_AUTH0_DOMAIN` | yes | Auth0 dashboard > Applications > SPA > Domain |
| `VITE_AUTH0_CLIENT_ID` | yes | Auth0 dashboard > Applications > SPA > Client ID (**not** the Client Secret) |
| `VITE_AUTH0_AUDIENCE` | yes | Auth0 dashboard > APIs > Identifier (currently `https://api.unigevents.ch`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | yes | Cloudinary dashboard |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | yes | Cloudinary dashboard (unsigned preset) |

All `VITE_*` values ship in the JavaScript bundle and are visible to anyone using the app. They are *not* secrets in the security sense — keeping them in Doppler is just for convenience and single-source-of-truth.

### Cross-cutting

| Name | Used where |
|---|---|
| `OPENAI_API_KEY` | Reserved for backend teammates' local experiments (no consumer in code yet) |
| `CLOUDFLARE_TUNNEL_TOKEN` | Backup of the token used by the `cloudflared` pod (k8s secret `cloudflared-token`) |

### Backend `prd` only (extracted from k8s Secrets on pinfo1)

| Name | k8s source |
|---|---|
| `USER_DB_PASSWORD` | `secret/user-db-secret` → `password` |
| `EVENT_DB_PASSWORD` | `secret/event-db-secret` → `password` |
| `REGISTRATION_DB_PASSWORD` | `secret/registration-db-secret` → `password` |
| `NOTIFICATION_DB_PASSWORD` | `secret/notification-db-secret` → `password` |
| `SEARCH_DB_PASSWORD` | `secret/search-db-secret` → `password` |
| `MODERATION_DB_PASSWORD` | `secret/moderation-db-secret` → `password` |
| `INTERNAL_SERVICE_KEY` | `secret/user-internal-key-secret` → `key` |

### Backend `dev` only

| Name | Notes |
|---|---|
| `DB_PASSWORD` | Safety net for non-`%dev`-profile local runs. In practice unused — see [§6 Gotchas](#6-gotchas). |
| `INTERNAL_SERVICE_KEY` | A random dev-only value (`openssl rand -hex 32`). **Must differ from prod.** |

### Not in Doppler

| Name | Why |
|---|---|
| `SONAR_TOKEN` | CI-only credential, lives in GitHub Actions secrets directly (no runtime use). |

---

## 3. Local setup

One-time, per laptop:

```bash
# 1. Install the CLI
brew install dopplerhq/cli/doppler

# 2. Authenticate (opens a browser)
doppler login

# 3. From the repo root: tell Doppler which project/config to use
doppler setup           # uses doppler.yaml → project=unigevents, config=dev
```

Verify:

```bash
doppler secrets --only-names
```

You should see all the names listed in [§2](#2-secret-inventory) under the `dev` columns.

---

## 4. Running the apps

The Doppler wrapper is already baked into the dev scripts — no manual `doppler run` needed.

### Backend

```bash
cd docker && docker compose up -d        # 6 Postgres containers + Kafka
cd ../backend && make dev-user           # or dev-event / dev-registration / …
```

The `make dev-*` targets wrap `./mvnw -pl <service> quarkus:dev` with `doppler run --`.

### Frontend

```bash
cd frontend && npm run dev               # wraps `vite` with `doppler run --`
```

Offline fallback (no Doppler):

```bash
npm run dev:nosecrets                    # uses frontend/.env if present
```

---

## 5. The `prd` config and the VM

The `prd` config is currently a **backup mirror** of what lives in microk8s Secrets on pinfo1. The cluster still reads its secrets directly from k8s (via `secretKeyRef` in the Deployment manifests), so the `prd` config in Doppler is not yet on the hot path.

This is a deliberate choice for now:

- The cluster works as-is.
- Doppler→k8s sync requires either an operator (Doppler Kubernetes Operator) or a CI step that templates the values into k8s Secrets — extra moving parts not worth it for a 1-cluster project.
- Having the values in Doppler `prd` means we can rebuild a fresh cluster without having to remember 7 random passwords.

### Re-extracting from pinfo1

If the `prd` config drifts (e.g. a teammate rotates a k8s Secret), refresh it by SSH-ing to pinfo1:

```bash
NS=unigevents
for svc in user event registration notification search moderation; do
  pwd=$(microk8s kubectl get secret ${svc}-db-secret -n $NS -o jsonpath='{.data.password}' | base64 -d)
  echo "${svc^^}_DB_PASSWORD=${pwd}"
done
microk8s kubectl get secret user-internal-key-secret -n $NS -o jsonpath='{.data.key}' | base64 -d
```

Paste the values into Doppler > unigevents > `prd`. Do **not** commit this output anywhere.

---

## 6. Gotchas

### `%dev` overrides shadow Doppler values

Each backend service has a per-service password baked into its `application.properties`:

```properties
quarkus.datasource.password=${DB_PASSWORD}            # used in %prod (the default profile)
%dev.quarkus.datasource.password=user_service_pwd     # used by `mvn quarkus:dev`
```

→ In `%dev` profile (`make dev-*`), Quarkus ignores `${DB_PASSWORD}` and uses the hardcoded value. Setting `DB_PASSWORD` in Doppler `dev` is therefore safe but redundant — the value never reaches the running app in dev mode.

The same `%dev`-shadow pattern does **not** exist for `INTERNAL_SERVICE_KEY`, which **is** read from Doppler at dev time (see [user-service application.properties:54](../backend/user-service/src/main/resources/application.properties)).

### `DB_URL` defaults assume local Postgres

The committed `application.properties` defaults for `DB_URL` point at `localhost:543X` (where `X` matches the host-side port from `docker/docker-compose.yml`). Docker Compose and k8s deployments inject `DB_URL` explicitly via env, which overrides the default — so this only matters for `make dev-*`.

### Never put prod secrets in `dev`

Anything you paste into the `dev` config can end up:
- on every teammate's laptop (`doppler secrets` reveals it),
- in CI build logs (the Doppler→GitHub sync mirrors `dev` into Actions secrets),
- in the frontend bundle if it has a `VITE_` prefix.

Real secrets that must not leak (prod DB passwords, prod `INTERNAL_SERVICE_KEY`, OAuth client secrets) belong in `prd` or `stg`, never `dev`.

### Frontend `VITE_*` are public

Vite inlines every `VITE_`-prefixed variable into the SPA bundle at build time. They are readable by anyone who opens DevTools. Auth0 documents both the Client ID and the SPA Domain as non-secret. If you ever feel tempted to put an API secret in `VITE_FOO`, **don't** — proxy it through a backend route instead.

---

## 7. Adding a new secret

1. **Decide the scope.** Is the value the same in dev and prod (e.g. Auth0 tenant)? Different (e.g. API base URL)? Prod-only (e.g. a real DB password)?
2. **Doppler dashboard > unigevents > pick the config(s).** Add the secret with `+ Add Secret`. For values shared across configs, add in each config separately — Doppler does not auto-propagate.
3. **For CI consumers:** make sure the Doppler→GitHub sync includes the new name (check Doppler > unigevents > `dev` > Integrations).
4. **For backend code:** reference it as `${MY_VAR}` in `application.properties` or via `@ConfigProperty(name = "my.var")`.
5. **For frontend code:** prefix with `VITE_` and reference as `import.meta.env.VITE_MY_VAR`. Remember it ends up in the bundle.

---

## See also

- [INSTALL.md](INSTALL.md) — full dev environment setup
- [CI-CD.md](CI-CD.md) — how Doppler-synced secrets reach the build pipeline
- [DEPLOYMENT.md](DEPLOYMENT.md) — how k8s Secrets are provisioned on pinfo1
