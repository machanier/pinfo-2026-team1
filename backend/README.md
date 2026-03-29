# Backend Microservices

This backend uses a microservice architecture with six independent **Java 21** Quarkus services.

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
- `docker-compose.yml` (six dedicated PostgreSQL databases)

## Start Databases

- Language: Java 21
- Framework: Quarkus 3.32.2
- ORM: Hibernate ORM with Panache
- Database: PostgreSQL
- Tests: Quarkus JUnit + Rest Assured
- Build tool: Maven

Start the database stack from the repository root:

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Java 21 and Maven.

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Run a Service in Dev Mode

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

## Build All Services

```bash
cd backend
./mvnw clean compile
```

Each microservice has its own PostgreSQL database and credentials in its own `application.properties`.
