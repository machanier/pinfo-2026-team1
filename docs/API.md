# Backend API Specification

This document describes the REST API exposed by the backend service of the **UNIGEvents** application.

The API is consumed by the frontend (React) and provides access to application data and functionality.

---

## Overview

- Architecture style: REST
- Data format: JSON
- Communication protocol: HTTP/HTTPS
- Base path (example): `/api`

---

## Authentication

Authentication mechanisms are not yet finalized.

Future versions may include:

- User login
- Session or token-based authentication
- Role-based access control

---

## Events Endpoints

### Get all events

Retrieve the list of available events.

```
GET /api/events
```

Response example:

```json
[
  {
    "id": 1,
    "title": "Science Conference",
    "date": "2026-05-12",
    "location": "Uni Mail"
  }
]
```

### Get event by ID

Retrieve details of a specific event.

```
GET /api/events/{id}
```

### Search events

Search events using keywords.

```
GET /api/events?search={keyword}
```

### Create event (future)

Create a new event.

```
POST /api/events
```

Request body example:

```json
{
  "title": "New Event",
  "date": "2026-06-01",
  "location": "Uni Bastions",
  "description": "Event description"
}
```

---

## User Endpoints (Future)

User-related features may include:

- User profile
- Event registration
- Event history
- Authentication

Examples:

```
GET /api/users/{id}
POST /api/auth/login
POST /api/events/{id}/register
```

---

## Error Handling

The API will return appropriate HTTP status codes:

- 200 OK — request successful
- 201 Created — resource created
- 400 Bad Request — invalid input
- 401 Unauthorized — authentication required
- 404 Not Found — resource not found
- 500 Internal Server Error — server failure

---

## Versioning

API versioning strategy is not yet defined.

Future versions may use:

```
/api/v1/...
```

---

## Notes

This specification is preliminary and will evolve as the project progresses.
