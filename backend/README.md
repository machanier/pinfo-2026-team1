# Backend Microservices

This backend now uses a microservice architecture with six independent Quarkus services.

## Services and Ports

- User Service: `8081`
- Event Service: `8082`
- Registration Service: `8083`
- Notification Service: `8084`
- Search Service: `8085`
- Moderation Service: `8086`

## Directory Layout

- `user-service/`
- `event-service/`
- `registration-service/`
- `notification-service/`
- `search-service/`
- `moderation-service/`
- `docker-compose.yml` (six dedicated PostgreSQL databases)

## Start Databases

```bash
cd backend
docker compose up -d
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
