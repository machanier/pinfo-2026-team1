# Auth0 setup (PINFO-190)

This document is the dashboard companion to the code in `frontend/src/auth/`. The frontend code expects a properly configured Auth0 tenant, and the backend services expect the JWT issued by that tenant to carry a roles claim. Setting either side without the other gives you a broken login flow.

## One-time tenant + application setup

1. **Create / pick a tenant.** The free dev tenant (`dev-cy8uphtpfx5bdclo.us.auth0.com`) we already use is fine for now. Create a separate prod tenant when the project leaves UNIGE; LOW-05 of the audit covers that. (PINFO-199: a brief switch to `unigevents.eu.auth0.com` was rolled back — every reference must point at the dev tenant.)
2. **Create a Single-Page Application** (Applications > Applications > Create Application > Single Page Web Application). Name it "UNIGEvents Frontend". Note the **Client ID** — that is `VITE_AUTH0_CLIENT_ID`.
3. In the application settings, set:
   - **Allowed Callback URLs**: `http://localhost:5173, http://localhost:3000, https://<your-prod-domain>` (5173 = Vite dev server, 3000 = Docker fullstack frontend)
   - **Allowed Logout URLs**: same list
   - **Allowed Web Origins**: same list
   - Save changes.
4. **Create an API** (Applications > APIs > Create API). Identifier (= audience): `https://api.unigevents.ch`. Signing algorithm RS256. Note the identifier — that is `VITE_AUTH0_AUDIENCE` and must match the backend `mp.jwt.verify.audiences` config in every service that validates JWTs.
5. Wire `frontend/.env` (copy from `.env.example`) with the three values; re-build the SPA so they bake into the bundle.

## Add the roles claim (Action)

Frontend (`AppContext`) and backend (`smallrye.jwt.path.groups`) both read roles from a custom claim at `https://unigevents.com/roles`. Auth0 does not emit it by default — add an Action:

1. **Auth Pipeline > Actions > Library > Create Action > Login / Post Login**. Name: "Add roles to access token".
2. Paste:
   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const roles = event.authorization?.roles ?? []
     api.accessToken.setCustomClaim('https://unigevents.com/roles', roles)
     api.idToken.setCustomClaim('https://unigevents.com/roles', roles)

     // Auth0 strips standard OIDC profile claims (name/email/picture) from
     // access tokens by default — they only ride on the id_token, which
     // the SPA keeps locally and never sends to backends. user-service's
     // syncUser provisions JIT from the access token, so we have to
     // republish the profile under namespaced custom claims (Auth0 forbids
     // overriding standard claim names on access tokens).
     api.accessToken.setCustomClaim('https://unigevents.com/name', event.user.name)
     api.accessToken.setCustomClaim('https://unigevents.com/email', event.user.email)
     api.accessToken.setCustomClaim('https://unigevents.com/picture', event.user.picture)
   }
   ```
3. **Deploy** the Action, then **Auth Pipeline > Flows > Login** and drag the Action into the post-login flow. Save.
4. Create the matching roles in **User Management > Roles** (`Student`, `Organizer`, `Admin`) and assign them to the test users.

After this, the access token Auth0 issues to the SPA will carry `https://unigevents.com/roles: ["Student"]` plus `https://unigevents.com/{name,email,picture}` for the user profile — all of which user-service reads in `UserSyncService` to provision the row in `users`.

## Enable MFA OTP (optional — future work)

> **Note:** MFA is **not available on the current free Auth0 tenant** — the multi-factor policy controls are locked. The steps below apply only on a tenant/plan where MFA can be enabled; treat this as future work rather than part of the current setup.

1. **Security > Multi-factor Auth > One-Time Password**: ON.
2. **Define policies** > "Always" (or "Risk-based" if you want to skip MFA on low-risk logins; we recommend Always for student data).
3. The first time a user signs in after this is enabled, Auth0 walks them through pairing an OTP app (Google Authenticator, 1Password, etc.). No frontend code change needed — the hosted login page handles the whole flow.

## Verifying the round-trip

Once the bundle is rebuilt with real env vars and a user has been created in the tenant:

1. Open the deployed SPA, click whatever route triggers `/login`. Auth0's hosted login appears.
2. Sign in. After the redirect, the SPA shows your name (read from `displayName` in `AppContext`).
3. Open DevTools > Network on a `/api/...` request. The `Authorization: Bearer …` header is set; decoding the JWT (jwt.io) shows `aud=https://api.unigevents.ch`, `iss=https://<tenant>/`, `https://unigevents.com/roles=["Student"]`.
4. Backend Quarkus services accept the request. If they return 401, check the audience and roles-claim path in `application.properties`.

## Troubleshooting

- **"Auth0 misconfigured" error in console** → one of the three `VITE_AUTH0_*` vars is missing or empty. Vite only reads them at build time, so a fresh `npm run build` is required after editing `.env`.
- **CORS error from `<tenant>/oauth/token`** → the SPA origin is not in the application's Allowed Web Origins.
- **Login succeeds but role is wrong** → the post-login Action is not deployed or not in the Login flow. Open the user's profile in Auth0 and verify the role is assigned at the user level too.
- **Backend returns 401 with `aud` mismatch** → the API identifier in Auth0 differs from `VITE_AUTH0_AUDIENCE` *or* from `mp.jwt.verify.audiences` on the Quarkus side. All three must agree.
