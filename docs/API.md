# Backend API Specification

This document describes the REST APIs exposed by the backend microservices of the **UNIGEvents** application. It is consumed by the React frontend.

> **Source of truth:** each service ships a machine-readable OpenAPI contract at
> `backend/<service>/src/main/resources/<service>.yaml`. The JAX-RS interfaces and
> request/response models are generated from those specs, so the YAML files always
> reflect the live API. This page is a human-friendly summary derived from them.

---

## Overview

- Architecture style: REST
- Data format: JSON
- Communication protocol: HTTP/HTTPS
- Gateway: in the cluster, all `/api/*` traffic is routed through the **Kong** API
  gateway (single public host). Service ports below are for **local development**
  only, where each service runs independently.

| Service | Local dev port | OpenAPI spec |
| --- | --- | --- |
| User Service | `8081` | `user-service.yaml` |
| Event Service | `8082` | `event-service.yaml` |
| Notification Service | `8083` | `notification-service.yaml` |
| Moderation Service | `8084` | `moderation-service.yaml` |
| Search Service | `8085` | `search-service.yaml` |
| Registration Service | `8086` | `registration-service.yaml` |

---

## Authentication & authorization

Authentication is handled by **Auth0** (OpenID Connect). The frontend obtains a JWT
access token and sends it as a bearer token:

```
Authorization: Bearer <access_token>
```

- **Roles** are carried in a custom claim and mapped to Quarkus security roles by
  `commons-security`. The primary roles are `STUDENT`, `ORGANIZER`, and `ADMIN` (an
  `ASSOCIATION` role is also accepted on association-profile writes).
- Authorization is enforced per-endpoint with `@RolesAllowed(...)` in each resource.
- **Public browsing:** read-only browsing endpoints (event listing/detail, calendar,
  search) are reachable **anonymously** through the gateway's anonymous consumer.
  Mutating endpoints and personal data require a valid JWT with the right role.
- **Internal endpoints** (`/internal/**`) are **service-to-service only**. They are
  not exposed publicly: they require the `InternalServiceKey` header and are further
  restricted by Kubernetes `NetworkPolicy`. The frontend never calls them.

Two security schemes are declared in the specs: `Auth0` (`openIdConnect`) and
`InternalServiceKey` (`apiKey`, header).

In the tables below the **Auth** column uses: `Public*` (anonymous browsing
supported), `JWT` (any authenticated user), `JWT (ROLE…)` (role-restricted),
`Internal` (service-to-service key).

---

## User Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/users/{userId}` | Get a user | JWT |
| `PUT` | `/api/users/{userId}` | Update a user (name, avatar) | JWT |
| `DELETE` | `/api/users/{userId}` | Soft-delete a user (also removed from Auth0) | JWT |
| `GET` | `/api/users/{userId}/student-profile` | Get the student profile | Public* |
| `PUT` | `/api/users/{userId}/student-profile` | Upsert the student profile | JWT (STUDENT/ADMIN) |
| `GET` | `/api/users/{userId}/association-profile` | Get the organizer/association profile | Public* |
| `PUT` | `/api/users/{userId}/association-profile` | Upsert the association profile | JWT (ORGANIZER/ASSOCIATION/ADMIN) |
| `GET` | `/internal/users/{userId}/exists` | Existence check | Internal |
| `GET` | `/internal/users/{userId}/eligibility` | Eligibility attributes (faculty/level) | Internal |
| `GET` | `/internal/users/{userId}/contact` | Contact info for notifications | Internal |

> Users are provisioned from Auth0 on first authenticated request (no public
> "create user" endpoint). The internal user UUID is derived deterministically from
> the Auth0 `sub`.

---

## Event Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/events` | List events (filters: `organizerId`, `status`, `after`, pagination) | Public* |
| `POST` | `/api/events` | Create an event (starts in `PENDING_MODERATION`) | JWT (ORGANIZER/ADMIN) |
| `GET` | `/api/events/{eventId}` | Get an event | Public* |
| `PUT` | `/api/events/{eventId}` | Update an event | JWT (ORGANIZER/ADMIN) |
| `DELETE` | `/api/events/{eventId}` | Delete an event | JWT (ORGANIZER/ADMIN) |
| `PATCH` | `/api/events/{eventId}/submit` | Submit a draft for moderation | JWT (ORGANIZER/ADMIN) |
| `PATCH` | `/api/events/{eventId}/cancel` | Cancel an event | JWT (ORGANIZER/ADMIN) |
| `GET` | `/api/events/{eventId}/announcements` | List announcements (paginated) | Public* |
| `POST` | `/api/events/{eventId}/announcements` | Submit an announcement for moderation | JWT (ORGANIZER/ADMIN) |
| `GET` | `/api/events/{eventId}/announcements/{announcementId}` | Get an announcement | Public* |
| `DELETE` | `/api/events/{eventId}/announcements/{announcementId}` | Delete an announcement | JWT (ORGANIZER/ADMIN) |
| `GET` | `/api/events/calendar` | Calendar view of events | Public* |
| `DELETE` | `/api/events/{eventId}/banner` | Remove the event banner image | JWT (ORGANIZER/ADMIN) |
| `GET` | `/internal/events/{eventId}` | Event lookup for other services | Internal |
| `GET` | `/internal/events/{eventId}/capacity` | Capacity lookup | Internal |

**Moderation flow (Kafka):**

- `POST /api/events` persists the event as `PENDING_MODERATION` and emits
  `event.submitted`.
- The event becomes publicly visible only after moderation publishes `APPROVED` on
  `event.moderated`.
- Announcements follow the same pattern via `announcement.submitted` /
  `announcement.moderated`.

---

## Registration Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `POST` | `/api/registrations` | Register the current user for an event (confirmed or waitlisted) | JWT (STUDENT) |
| `GET` | `/api/registrations/me` | List the current user's registrations (paginated) | JWT (STUDENT) |
| `GET` | `/api/registrations/{registrationId}` | Get a registration | JWT (STUDENT) |
| `DELETE` | `/api/registrations/{registrationId}` | Cancel a registration | JWT (STUDENT) |
| `GET` | `/api/events/{eventId}/registrations` | List an event's registrations (organizer view) | JWT (ORGANIZER/ADMIN) |
| `GET` | `/api/events/{eventId}/registrations/stats` | Registration counts/stats | JWT (ORGANIZER/ADMIN) |
| `PATCH` | `/api/events/{eventId}/registrations/{registrationId}/confirm` | Confirm a waitlisted registration | JWT (ORGANIZER/ADMIN) |
| `GET` | `/internal/events/{eventId}/registrations/participants` | Participant list for other services | Internal |
| `GET` | `/internal/events/{eventId}/registrations/confirmed` | Confirmed-attendee IDs | Internal |

---

## Notification Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | List the current user's notifications (filters: `read`, `type`, pagination; returns `unreadCount`) | JWT |
| `GET` | `/api/notifications/unread-count` | Unread count (for the navbar badge) | JWT |
| `PATCH` | `/api/notifications/{notificationId}/read` | Mark one notification as read | JWT |
| `PATCH` | `/api/notifications/read-all` | Mark all as read | JWT |
| `GET` | `/api/notifications/preferences` | Get notification preferences | JWT |
| `PATCH` | `/api/notifications/preferences` | Update notification preferences | JWT |

> Notifications are **produced by Kafka consumers** (registration confirmed/waitlisted,
> announcement posted, event reminders…) and optionally delivered by email. There is
> no public endpoint to create a notification directly.

---

## Search Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/search/events` | Search events (full-text + facets: category, place, date range, availability; pagination/sort) | Public* |
| `GET` | `/api/search/events/suggestions` | Type-ahead suggestions | Public* |
| `GET` | `/api/search/organizers` | Search organizers | Public* |

> The search index is kept up to date by consuming event lifecycle events from Kafka.

---

## Moderation Service

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/moderation/queue` | List moderation cases (filter by status, pagination) | JWT (ADMIN) |
| `GET` | `/api/moderation/queue/{caseId}` | Get a moderation case | JWT (ADMIN) |
| `PATCH` | `/api/moderation/queue/{caseId}/approve` | Approve a case (optional `adminNote`) | JWT (ADMIN) |
| `PATCH` | `/api/moderation/queue/{caseId}/reject` | Reject a case (requires `reason`) | JWT (ADMIN) |

**Behavior:**

- Cases are created from `event.submitted` / `announcement.submitted` and screened
  automatically (OpenAI). High-confidence content is auto-approved; the rest lands in
  the queue for an admin.
- Approve/reject emits the final decision on `event.moderated` /
  `announcement.moderated`, which the event-service consumes to publish or reject the
  content.

---

## Error Handling

Standard HTTP status codes are used:

- `200 OK` — request successful
- `201 Created` — resource created
- `400 Bad Request` — invalid input (request bodies are validated via Bean Validation
  generated from the OpenAPI constraints, e.g. required fields, `capacity >= 1`)
- `401 Unauthorized` — missing or invalid JWT
- `403 Forbidden` — authenticated but lacking the required role
- `404 Not Found` — resource not found
- `409 Conflict` — state conflict (e.g. registering for a full event, re-submitting an
  event in an invalid state)
- `500 Internal Server Error` — server failure

---

## Related documentation

- `docs/ARCHITECTURE.md` — service responsibilities and Kafka topics
- `docs/AUTH0.md` — authentication setup and role mapping
- `docs/DEPLOYMENT.md` — Kong gateway, ingress, and environments
