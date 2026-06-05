# Backend Microservices

This backend uses a microservice architecture with six independent **Java 21** Quarkus services that communicate asynchronously over Apache Kafka.

## Services and Ports

- User Service: `8081`
- Event Service: `8082`
- Notification Service: `8083`
- Moderation Service: `8084`
- Search Service: `8085`
- Registration Service: `8086`

## Directory Layout

- `user-service/`
- `event-service/`
- `registration-service/`
- `notification-service/`
- `search-service/`
- `moderation-service/`
- `commons-security/` — shared JWT / role-mapping and security filters
- `commons-cloudinary/` — shared Cloudinary signed-upload helpers
- `kong/` — declarative Kong API gateway configuration
- `e2e/` — end-to-end test suite (standalone, outside the Maven reactor)

## Tech Stack

- Language: Java 21
- Framework: Quarkus 3.36.0
- ORM: Hibernate ORM with Panache
- Database: PostgreSQL (one per service)
- Messaging: Apache Kafka
- Tests: Quarkus JUnit + REST Assured, with JaCoCo coverage
- Build tool: Maven

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Java 21 and Maven.

Start the database and Kafka stack from the repository root:

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Run a Service in Dev Mode

With Doppler (secrets — e.g. the moderation service's `OPENAI_API_KEY` — injected automatically):

```bash
cd backend
make dev-user
```

Available targets: `dev-user`, `dev-event`, `dev-registration`, `dev-notification`, `dev-search`, `dev-moderation`.

Without Doppler (offline / debugging, no secrets injected):

```bash
cd backend
./mvnw -pl user-service quarkus:dev
```

Replace `user-service` with any of:

- `event-service`
- `registration-service`
- `notification-service`
- `search-service`
- `moderation-service`

See [`frontend/README.md`](../frontend/README.md#secrets-management-doppler) for the one-time Doppler setup (CLI install + `doppler login` + `doppler setup`).

## Build All Services

```bash
cd backend
./mvnw clean compile
```

## Run Tests

```bash
cd backend
./mvnw verify
```

Runs the unit and `@QuarkusTest` suites and produces the JaCoCo coverage reports that SonarCloud consumes. CI runs this against a PostgreSQL service container; to run it locally, point the `DB_*` environment variables at a reachable Postgres instance.

Each microservice has its own PostgreSQL database and credentials in its own `application.properties`.
