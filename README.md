# AlgoTrade Platform

A trading-strategy simulation and backtesting platform for retail traders, built as eight Spring Cloud microservices. Today it runs self-contained on data in its own MySQL schemas; a Tinkoff API market-data feed is the planned next milestone and is not implemented yet.

## Overview

**Type:** Backend Microservices Platform  
**Goal:** Let a user enter a trading strategy and see its analysis, simulated trades and profitability against real market data before risking capital.  
**Audience:** Retail traders and investors, from investment beginners to professionals

## Tech Stack

For the complete technology stack and configuration, see [Development Rules](.opencode/rules/development.md#project-technology-stack).

## Getting Started

### Prerequisites

- JDK 17
- Maven 3.8.6 or the Maven wrapper committed in each module
- HashiCorp Consul on `localhost:8500`
- MySQL `persons_schema` on `localhost:3306`
- MySQL `users_schema` on `localhost:3307`
- SMTP access for `notification-service`

### Local startup

1. Start Consul and provision the two MySQL schemas.
2. Start `config-service` on port `8888`.
3. Start the services required by the workflow being tested.
4. Start `gateway-service` on port `3535` and reach downstream services through it.
5. Use Consul discovery for `person-service`, `user-service` and `notification-service`; their ports are assigned at startup.

> The canonical authentication design is still unresolved. Do not treat the current `/auth` endpoints or gateway filters as a production security boundary.

### Run tests

Run tests from the module being changed:

```powershell
cd user-service
.\mvnw.cmd test
```

## Project Structure

- `gateway-service/` — reactive edge and gateway routes
- `auth-service/` — inert authentication scaffold
- `user-service/` — users, roles and validation-related endpoints
- `person-service/` — person CRUD and MySQL persistence
- `account-service/` — non-running scaffold
- `notification-service/` — scheduler-driven SMTP service
- `config-service/` — native Spring Cloud Config documents
- `admin-service/` — Spring Boot Admin UI
- `docs/INDEX.md` — central documentation index

For agent instructions, see [AGENTS.md](AGENTS.md).

---

## Legacy Notes (preserved from the original README)

> The current config-service uses the native classpath backend. The external Git configuration backend and SSH deploy-key instructions below are preserved as historical notes and are commented out in the current configuration.

Microservices platform to manage TinkoffAPI.  
JDK 17

Для работы config-service необходимо сгенерить ssh-rsa ключ с помощью  
`ssh-keygen -m PEM -t rsa -b 4096 -f ~/config_server_deploy_key.rsa`  
этот Public ключ нужен на github.com в Settings.  
Затем:  
`ssh -T git@github.com`
