# Backend Integration Notes For Frontend

This document summarizes what frontend developers need to know to integrate with the backend in this project.

## 1) Current Backend Architecture

The backend is split into microservices.

- User service: `http://localhost:8081`
- Event service: `http://localhost:8082`
- Notification service: `http://localhost:8083`
- Moderation service: `http://localhost:8084`
- Search service: `http://localhost:8085`
- Registration service: `http://localhost:8086`

In local full-stack mode, Kong is available on `http://localhost:8000`, but the frontend currently routes directly to services based on endpoint prefix.

In current frontend code, API calls are sent to a single base URL (`VITE_API_BASE_URL`).
Routing to internal microservices must be handled by backend infrastructure (Gateway/BFF/Kong), not by frontend.

## 2) How Frontend Sends API Calls

File: `src/lib/apiClient.js`

The frontend uses one Axios instance and a single base URL:

- `VITE_API_BASE_URL`

Frontend no longer maps endpoint prefixes to service ports. This is intentionally backend responsibility.

## 3) Environment Variables Used By Frontend

General:

- `VITE_API_BASE_URL` backend entrypoint used by Axios

Profile/mock:

- `VITE_PROFILE_MOCK=true|false`

Auth simulation in dev:

- `VITE_SIMULATE_ORGANIZER_AUTH=true|false`
- `VITE_SIMULATE_STUDENT_AUTH=true|false`

Behavior in dev:

- Organizer true: simulate connected organizer
- Student true: simulate connected student
- Both false: force logged-out state and redirect to login for private routes

## 4) Auth Behavior Expected In Frontend

File: `src/lib/apiClient.js`

For each request, frontend tries to read one of:

- `auth_token`
- `access_token`

from localStorage/sessionStorage and sets:

- `Authorization: Bearer <token>`

Current status:

- Real login/token issuance is not finalized in backend
- Frontend supports simulation modes to continue development

## 5) User/Profile Endpoints Actually Used

Files: `src/lib/profileUtils.js`, `src/pages/ProfilePage.jsx`, `src/pages/EditProfilePage.jsx`

Current frontend profile flow:

1. `GET /api/users/{userId}?include=profile-details`
2. Update user display name/avatar: `PUT /api/users/{userId}`

Important: frontend now expects the backend to return the aggregated profile payload in a single response.

## 6) Data Shape Notes (Defensive Frontend Logic)

Profile normalization currently accepts both naming styles:

- `snake_case` (`created_at`, `avatar_url`, `student_profile`)
- `camelCase` (`createdAt`, `avatarUrl`, `studentProfile`)

Reason: backend responses are not fully standardized yet.

## 7) Known Integration Risks

- Contract mismatch across services (payload fields and naming)
- Role naming mismatch risk (`ORGANIZER` vs `Association`/`Organizer` conventions)
- Missing auth flow can cause route redirects or forbidden calls
- Missing aggregated profile payload from backend can break profile pages

## 8) Frontend Checklist Before Calling Backend

- Confirm `VITE_API_BASE_URL` points to your API entrypoint (Gateway/BFF)
- Confirm endpoint exists and method matches implementation
- Confirm auth requirement for endpoint (`Authorization` expected or not)
- Confirm request/response field naming
- Add loading and error UI state for each API call
- Keep mock fallback for local development when service is unavailable

## 9) What To Ask Backend Team

Priority requests for smoother frontend integration:

1. Keep one stable API entrypoint (Gateway/BFF) for frontend
2. Standardized JSON naming convention across all services
3. Implement and stabilize aggregated profile response for `GET /api/users/{id}?include=profile-details`
4. Stable auth contract (login, refresh, expected claims/roles)
5. Consistent error response format (`code`, `message`, optional `details`)
6. OpenAPI specs aligned with real deployed endpoints

## 10) Quick Local Setup Reference

Frontend only:

1. `cd frontend`
2. `npm install`
3. `npm run dev`

Build check:

1. `cd frontend`
2. `npm run build`

Backend full stack typically requires DB + services + optional Kong from docker compose.
