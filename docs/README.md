# Project Documentation

This folder contains the technical documentation of the **UNIGEvents** project: system architecture, development environment, API design, secret management, deployment, and the operational runbooks used during the project.

| Guide                              | Description                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| [INSTALL.md](./INSTALL.md)         | Configure the development environment and required tools                            |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture: frontend, backend microservices, Kafka, per-service databases |
| [API.md](./API.md)                 | REST API specification for the six backend microservices                            |
| [AUTH0.md](./AUTH0.md)             | Auth0 tenant configuration and JWT / roles setup                                    |
| [DOPPLER.md](./DOPPLER.md)         | Secret management with Doppler                                                       |
| [MIGRATIONS.md](./MIGRATIONS.md)   | Database migration strategy (Flyway)                                                 |
| [DEPLOYMENT.md](./DEPLOYMENT.md)   | Production deployment (Kubernetes, Kong, Cloudflare Tunnel)                          |
| [CI-CD.md](./CI-CD.md)             | Continuous integration and delivery pipeline                                         |
| [INCIDENTS.md](./INCIDENTS.md)     | Production incident response runbook                                                 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Git Flow conventions, branch naming, commits, and Jira integration                |
