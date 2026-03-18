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

| Method | Path               | Description               |
|--------|--------------------|---------------------------|
| GET    | `/api/events`      | Liste tous les événements |
| GET    | `/api/events/{id}` | Récupère un événement     |
| POST   | `/api/events`      | Crée un événement         |
| DELETE | `/api/events/{id}` | Supprime un événement     |

Swagger UI disponible sur : `http://localhost:8080/swagger-ui`

---

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Java 17 and Maven.

```bash
# Lancer en mode développement (hot reload)
cd backend
./mvnw quarkus:dev
```

> Une base de données PostgreSQL doit tourner. Utilise Docker Compose (voir `docker/`).
