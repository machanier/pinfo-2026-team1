# Backend API Specification

This document describes the REST APIs exposed by the backend microservices of the **UNIGEvents** application.

The API is consumed by the frontend (React) and provides access to application data and functionality.

---

## Overview

- Architecture style: REST
- Data format: JSON
- Communication protocol: HTTP/HTTPS
- Service ports:
  - User Service: `8081`
  - Event Service: `8082`
  - Registration Service: `8083`
  - Notification Service: `8084`
  - Search Service: `8085`
  - Moderation Service: `8086`

---

## Authentication

Authentication mechanisms are not yet finalized.

Future versions may include:

- User login
- Session or token-based authentication
- Role-based access control

---

## User Service (`http://localhost:8081`)

### Get users

```
GET /api/users
```

### Create user

```
POST /api/users
```

Body example:

```json
{
  "username": "alice",
  "email": "alice@example.org"
}
```

---

## Event Service (`http://localhost:8082`)

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
GET /api/events?q={keyword}
```

### Create event

Create a new event.

```
POST /api/events
```

Request body example:

```json
{
  "title": "New Event",
  "location": "Uni Bastions",
  "description": "Event description"
}
```

---

## Registration Service (`http://localhost:8083`)

### Get registrations

```
GET /api/registrations
```

### Create registration

```
POST /api/registrations
```

Body example:

```json
{
  "userId": 1,
  "eventId": 2,
  "status": "REGISTERED"
}
```

---

## Notification Service (`http://localhost:8084`)

### Get notifications

```
GET /api/notifications
```

### Create notification

```
POST /api/notifications
```

Body example:

```json
{
  "userId": 1,
  "channel": "EMAIL",
  "message": "Your registration is confirmed."
}
```

---

## Search Service (`http://localhost:8085`)

### Get search documents

```
GET /api/search/documents
```

### Search documents by query

```
GET /api/search/documents?q={keyword}
```

### Create searchable document

```
POST /api/search/documents
```

Body example:

```json
{
  "type": "event",
  "content": "Science conference at Uni Mail"
}
```

---

## Moderation Service (`http://localhost:8086`)

### Get moderation flags

```
GET /api/moderation/flags
```

### Create moderation flag

```
POST /api/moderation/flags
```

Body example:

```json
{
  "targetType": "event",
  "targetId": 7,
  "reason": "Inappropriate content",
  "status": "OPEN"
}
```

---

## Error Handling

The API will return appropriate HTTP status codes:

- 200 OK — request successful
- 201 Created — resource created (some current endpoints may return 200 until response status handling is customized)
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
