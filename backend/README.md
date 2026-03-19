# Backend

This folder contains the backend service of the **UNIGEvents** application.

The backend is implemented with **Java 17** using the **Quarkus** framework.

---

## Tech Stack

- Language: Java 17
- Framework: Quarkus 3.32.2
- ORM: Hibernate ORM with Panache
- Database: PostgreSQL
- Tests: Quarkus JUnit + Rest Assured
- Build tool: Maven

---

## Structure

```
src/
├── main/
│   ├── java/ch/unige/pinfo/
│   │   └── event/
│   │       ├── Event.java          ← entité JPA (table "event")
│   │       └── EventResource.java  ← endpoints REST /api/events
│   └── resources/
│       └── application.properties  ← configuration (DB, Hibernate, Swagger)
└── test/
    └── java/ch/unige/pinfo/
        └── event/
            └── EventResourceTest.java
```

---

## API Endpoints

| Method | Path               | Description        |
|--------|--------------------|---------------------|
| GET    | `/api/events`      | List all events     |
| GET    | `/api/events/{id}` | Get an event by ID  |
| POST   | `/api/events`      | Create an event     |
| DELETE | `/api/events/{id}` | Delete an event     |

Swagger UI available at: `http://localhost:8080/swagger-ui`

---

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Java 17 and Maven.

```bash
# Start in development mode (hot reload)
cd backend
./mvnw quarkus:dev
```

> A PostgreSQL database must be running. Use Docker Compose (see `docker/`) or the Dev Container.
