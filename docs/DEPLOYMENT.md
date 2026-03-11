# Deployment Guide

This document describes how the **UNIGEvents** application can be deployed.

---

## Local Deployment

During development, the application is intended to run locally.

Components:

- Frontend
- Backend
- PostgreSQL database

Deployment is expected to use Docker containers.

---

## Container-Based Deployment

Each component may run in its own container:

- Frontend container
- Backend container
- Database container

Docker ensures reproducibility across environments.

---

## Future Kubernetes Deployment

Kubernetes may be used to orchestrate containers.

Potential benefits:

- Scalability
- High availability
- Automated recovery
- Service discovery

This is planned as a future improvement.

---

## Production Deployment (Future)

Production deployment strategy is not yet defined.

Possible targets include:

- Cloud platforms
- On-premise servers
- University infrastructure

---

## Environment Configuration

Environment variables may be used for:

- Database connection settings
- API configuration
- Security parameters
- Deployment-specific options