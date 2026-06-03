# System Architecture

This document describes the high-level architecture of the **UNIGEvents** application.

---

## Overview

UNIGEvents is a web-based platform that allows users to discover and manage university events.

The architecture is based on:

- **Frontend** — Single Page Application (React / Vite)
- **Backend** — Six Java 21 / Quarkus microservices
- **Databases** — Six isolated PostgreSQL instances (one per microservice)

```
+-------------------+
| Web Browser       |
| (User Client)     |
+---------+---------+
          |
          | HTTP/HTTPS
          v
+-------------------+
| Frontend (SPA)    |
| React / Vite      |
+---------+---------+
          |
          | REST API (JSON over HTTP)
          v
+-------------------+    +---------------------+
| User Service      | -> | users_db            |
| :8081             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Event Service     | -> | events_db           |
| :8082             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Notification Svc  | -> | notification_db     |
| :8083             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Moderation   Svc  | -> | moderation_db       |
| :8084             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Search Service    | -> | search_db           |
| :8085             |    | PostgreSQL          |
+-------------------+    +---------------------+

+-------------------+    +---------------------+
| Registration Svc  | -> | registration_db     |
| :8086             |    | PostgreSQL          |
+-------------------+    +---------------------+
```

Each database runs in Docker during local development. Microservices run in Quarkus dev mode.

---

## Frontend

The frontend is a Single Page Application (SPA) built with **React** and bundled by **Vite**.

Responsibilities:

- User interface and navigation
- Event browsing and visualization
- Sending requests to backend APIs
- Rendering data returned by backend services

The frontend communicates exclusively with backend APIs through HTTP requests. Direct access to databases is not allowed.

---

## Backend Microservices

The backend is implemented using **Java 21 with the Quarkus framework**.

- **User Service** (`:8081`) — users
- **Event Service** (`:8082`) — events
- **Notification Service** (`:8083`) — notifications
- **Moderation Service** (`:8084`) — moderation flags
- **Search Service** (`:8085`) — search documents
- **Registration Service** (`:8086`) — event registrations

Each service has:

- Its own codebase module in [backend](../backend)
- Its own PostgreSQL schema and credentials
- Its own Quarkus application configuration

See the [API specification](API.md) for endpoint details.

---

## Async Messaging (Kafka)

Two of the six microservices (event-service and registration-service) also communicate **asynchronously** through a Kafka event bus. This is in addition to — not in replacement of — the synchronous REST calls. The frontend never touches Kafka; it is purely a backend-to-backend channel.

### Why Kafka and not REST?

The two flows that use Kafka are **side effects** of an action that has already been confirmed to the user via REST. Specifically:

- When event-service marks an event `CANCELLED`, every confirmed/waitlisted registration on that event must transition to `CANCELLED` too. The user who cancelled the event has already received their `200 OK` from `DELETE /api/events/<id>` — the registration cleanup happens after, not on the request path.
- When a registration is created, confirmed, or moved off the waitlist, downstream consumers (notification-service in the future) need to know.

Kafka is preferred over a synchronous REST call here because:

1. **Decoupling** — event-service does not need to know that registration-service exists. Adding a future consumer (e.g. notification-service subscribing to `event.cancelled` to email attendees) requires zero changes upstream.
2. **Resilience** — if registration-service is down for 30s, the events accumulate in the topic and are processed when it recovers. With a synchronous REST cascade, the cancellation would either fail or rollback.
3. **No blocking** — event-service responds to the user without waiting for downstream cleanup to complete.

### Topics

```
+-----------------+   event.submitted     +-----------------------+
|  event-service  | -------------------> |  moderation-service    |
|     :8082       |                      |  consumes submissions  |
|  (producers)    | <------------------- |  emits event.moderated |
|                 |   event.moderated     +-----------------------+
|                 |   event.updated       +-----------------------+
|                 | -------------------> |  notification/search   |
|                 |   event.cancelled     +-----------------------+
+-----------------+ -------+-----------+
                           |
                           |     consumed by
                           v
+----------------------+   registration.confirmed    +-----------------------+
|registration-service  | -------------------------> |  (future consumers:    |
|     :8086            |   registration.waitlisted  |   notification-service)|
|  (producer + consumer)| -------------------------> +-----------------------+
|                      |   registration.cancelled
|                      | ----------+
|                      |
|  EventCancelledConsumer reads `event.cancelled`,
|  bulk-updates Registration rows to CANCELLED.
+----------------------+
```

| Topic | Producer | Current consumers |
|---|---|---|
| `event.submitted` | event-service | moderation-service |
| `event.moderated` | moderation-service | event-service |
| `announcement.submitted` | event-service | moderation-service |
| `announcement.moderated` | moderation-service | event-service |
| `event.updated` | event-service | (none yet) |
| `event.cancelled` | event-service | registration-service ([`EventCancelledConsumer`](../backend/registration-service/src/main/java/ch/unige/pinfo/registration/messaging/EventCancelledConsumer.java)) |
| `registration.confirmed` | registration-service | (none yet) |
| `registration.waitlisted` | registration-service | (none yet) |
| `registration.cancelled` | registration-service | (none yet) |

The "(none yet)" topics are wired on the producer side so future consumers can subscribe without changing producer code. Auto-create is enabled on the broker, so a new subscriber declaring `@Incoming("event.created")` just works.

### Wiring

Messages are emitted via [SmallRye Reactive Messaging](https://smallrye.io/smallrye-reactive-messaging/) — Quarkus `@Channel`/`Emitter` for producers (see [`EventChangePublisher`](../backend/event-service/src/main/java/ch/unige/pinfo/event/messaging/EventChangePublisher.java) and [`RegistrationEventPublisher`](../backend/registration-service/src/main/java/ch/unige/pinfo/registration/messaging/RegistrationEventPublisher.java)), `@Incoming` for consumers. Channel-to-topic mapping lives in each service's `application.properties`.

The bootstrap server URL is injected via the env var `KAFKA_BOOTSTRAP_SERVERS`:

| Environment | Value | Source |
|---|---|---|
| Local dev (`docker compose --profile fullstack up`) | `kafka:9092` | [`docker/docker-compose.yml`](../docker/docker-compose.yml) — runs `confluentinc/cp-kafka:7.6.0` |
| Production (microk8s on pinfo1, since PINFO-202) | `kafka:9092` | [`k8s/kafka/`](../k8s/kafka/) — single-broker StatefulSet, headless Service |
| Local dev WITHOUT docker-compose (`mvn quarkus:dev`) | `localhost:9092` (fallback) | [application.properties default](../backend/registration-service/src/main/resources/application.properties) |

The third row exists so a developer running individual services through `mvn quarkus:dev` doesn't crash at boot when no broker is reachable; the Kafka client just fails its async reconnection loop without blocking startup. See PINFO-206 for why the eager-init failure mode of `@Incoming` consumers required this fallback.

### Health and the messaging-flag

Both event-service and registration-service set `quarkus.messaging.health.enabled=false`. This **decouples the service's `/q/health/ready` from the Kafka broker's health**: a temporary broker outage does not flip the service Ready=False and trigger an avalanche of 503s on synchronous APIs. The Kafka publishers and consumers continue to retry in the background; the synchronous HTTP path is unaffected.

This is intentional and not a leftover from when Kafka wasn't deployed. See the comment block in each service's `application.properties` for the longer rationale.

### Production deployment notes

Three non-obvious settings on the [k8s/kafka/](../k8s/kafka/) StatefulSet were tuned after the initial PINFO-202 deployment hit them in succession. Each is explained at length in the corresponding manifest comment block; the short version:

- **`requests.cpu: 100m`** ([`kafka-statefulset.yaml`](../k8s/kafka/kafka-statefulset.yaml)). The pinfo1 worker node has only 2 CPUs and the other backend pods already request ~1850m, so the broker's request must stay small. A request of 200m used to silently leave the pod `Pending` with no scheduler event because modern k8s rate-limits "no node available" messages.

- **`publishNotReadyAddresses: true`** on the `kafka` Service ([`kafka-service.yaml`](../k8s/kafka/kafka-service.yaml)). KRaft mode in single-pod mode requires the broker to resolve its OWN stable DNS name `kafka-0.kafka:9093` at startup (the controller voter is itself). Without this flag, the chicken-and-egg deadlocks: DNS only resolves once Ready, Ready only flips once the broker registered with the controller, the controller is the broker. Same pattern as Strimzi.

- **Readiness probe `timeoutSeconds: 15`, `periodSeconds: 30`** ([`kafka-statefulset.yaml`](../k8s/kafka/kafka-statefulset.yaml)). The probe runs `kafka-broker-api-versions`, which spawns a fresh Kafka JVM client on every invocation. JVM cold-start on the 100m-CPU pod takes 5-10s — a tighter timeout produced indefinite `Running 0/1` even though the broker was fully up.

If the StatefulSet's readiness probe ever needs to change again, note that a rolling update will not progress while the existing `kafka-0` is `NotReady` (the StatefulSet controller waits for the current pod to be Ready before terminating it). The only way out is `kubectl delete pod kafka-0` after the new spec is applied — the PVC `data-kafka-0` persists, so no data is lost.

### Future work

- **High availability**: today's single-broker setup loses messages between a broker pod restart and the next reconnect. Multi-broker via [Strimzi operator](https://strimzi.io/) is the standard k8s pattern; tracked separately.
- **Topic provisioning by CRD**: auto-create is on for the project cluster, but production-grade setups should pin partition count and retention per topic via Strimzi's `KafkaTopic` CRD.
- **SASL/SCRAM auth**: today the broker is open to any pod that the NetworkPolicy admits (`event-service`, `registration-service` — see [`k8s/network-policies/45-kafka.yaml`](../k8s/network-policies/45-kafka.yaml)). For multi-tenant or stricter setups, add SASL credentials per service.
- **Observability**: messaging metrics are exposed by Quarkus via Micrometer at `/q/metrics`, but no Grafana dashboard tracks consumer lag yet.

---

## Databases

The system uses **PostgreSQL** with one database per service:

- `users_db`
- `events_db`
- `registrations_db`
- `notifications_db`
- `search_db`
- `moderation_db`

Each database is accessed only by its owning service.

---

## Local Development

Two options are available for local development:

| Option                          | How it works                                                                                                                        | See                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Dev Container** (recommended) | VS Code runs inside a Docker container with all tools pre-installed. Start the backend database stack, then run services via tasks. | [Installation Guide](INSTALL.md) |
| **Manual setup**                | Install Java, Node, and Docker locally. Start all databases via Docker Compose, then run backend services and frontend manually.    | [Installation Guide](INSTALL.md) |

For local deployment details, see the [Deployment Guide](DEPLOYMENT.md).
