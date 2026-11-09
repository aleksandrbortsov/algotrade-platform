# Project Development Guidelines

> **Central Development Rule** — Technology stack reference and architecture overview.
>
> Workflow orchestration is handled by [orchestrator.md](orchestrator.md). Specialized agents in `.opencode/agents/` and domain skills in `.opencode/skills/` are discovered and activated natively by OpenCode — subagents by their `description` frontmatter (automatically or via `@name`), skills through the `skill` tool. Each domain skill has a `project-config.json` with project-specific configuration filled during initialization Phase 6.

---

## Project Technology Stack

> **Single Source of Truth:** This section is automatically populated during project initialization (Phase 3).
>
> Detected automatically on 2026-11-09 from `pom.xml` files, `src/main/resources/**` and module layout (`EXISTING_PROJECT` mode); accepted by the user without corrections. Phase 4 component analysis subsequently corrected the security, Maven-wrapper and persistence attribution below.

### Core Technologies

- **Framework:** Spring Boot **2.7.5** (`spring-boot-starter-parent`) on **Java 17**, with Spring Cloud **2021.0.5** — 8 microservice modules under one Maven aggregator
- **Build Tool:** **Maven** (multi-module reactor, `<packaging>pom</packaging>`). A per-module Maven wrapper is committed in all 8 modules (wrapper 3.1.0 / Maven 3.8.6), although several module POMs pin compiler source/target to **10** while the parent declares Java 17. `spring-boot-maven-plugin` repackages each service; `maven-compiler-plugin` 3.8.1 runs Lombok and MapStruct as annotation processors
- **Styling:** Not applicable — the repository contains no frontend, no CSS, no JavaScript or TypeScript
- **State Management:** Not applicable (no UI). Server-side state lives in MySQL via Spring Data JPA
- **Testing:** `spring-boot-starter-test` (JUnit 5, Mockito, AssertJ, MockMvc) declared in 7 of 8 modules — **only 2 test classes exist** in the whole repository. No Jacoco, no Surefire/Failsafe customization
- **Package Manager:** Maven (dependency versions come from the parent `pom.xml` `<properties>` block; no lockfile mechanism is used by Maven)
- **TypeScript:** Not applicable

### Stack Details

- **Framework Version:** Spring Boot 2.7.5 / Spring Cloud 2021.0.5 / Spring Boot Admin 2.7.7 / Java 17 (`java.version` property)
- **Key Dependencies:**
  - `spring-cloud-starter-gateway` — reactive edge router (`gateway-service`)
  - `spring-cloud-config-server` — externalised configuration, `native` profile (`config-service`)
  - `spring-cloud-starter-consul-discovery` — service registration in **7 of 8** modules (`account-service` omits it entirely); `spring-cloud-starter-consul-config` additionally in the gateway
  - `spring-security-oauth2-authorization-server` 1.0.0 + `spring-boot-starter-security` — **declared but commented out in `auth-service`**; no OAuth2 endpoints or signing/verification beans are registered today
  - `spring-boot-starter-data-jpa` + `mysql-connector-j` — active JPA in `person-service` and `user-service`; `account-service` declares JPA but has no datasource, while `auth-service` has JPA/MySQL commented out
  - `spring-boot-starter-mail` — SMTP delivery (`notification-service`)
  - `mapstruct` 1.5.3.Final + `lombok` 1.18.24 — DTO mapping and boilerplate reduction
  - `aerogear-otp-java` 1.0.0 + `zxing` (`core`, `javase`) — TOTP secret and QR provisioning only; code verification is commented out, so second factor is not enforced today (`user-service`)
  - `spring-boot-admin-starter-server` / `-client` — fleet monitoring (`admin-service` plus most clients)
- **Development Tools:** Checkstyle, SonarLint and PMD are configured **in the IntelliJ project only** (`.idea/checkstyle-idea.xml`, `.idea/sonarlint/…`, `.idea/PMDPlugin.xml`) — **none of them run in the Maven build**, so nothing is enforced on a clean checkout or in CI. No CI server is configured at all (no `.github/`, no `.gitlab-ci.yml`, no `Jenkinsfile`).

### Stack Configuration Notes

- **Version-pin drift to watch.** Four JWT stacks are declared: active `jjwt` 0.9.1 in `auth-service` and `user-service`, a commented `jjwt-api` 0.11.5 / `jjwt-impl` 0.11.2 / `jjwt-jackson` 0.11.2 trio in `auth-service`, and commented `java-jwt` 4.2.1 in `gateway-service`. The gateway does not parse JWTs today, while user-service uses deprecated JJWT 0.9.1 HS512. Consolidate and choose one canonical library only after the authentication design is settled.
- **Authorization-server dependency is inert, not runtime-compatible.** `spring-security-oauth2-authorization-server` **1.0.0** and the entire `AuthorizationServerConfig` bean graph are commented out in `auth-service`. The 1.0.x line is generally associated with Spring Boot 3.x while 0.4.x targets 2.7.x; do not uncomment it without a dependency-tree check. The current auth-service is a non-functional scaffold rather than an active authorization server.
- **Schema management is Hibernate, not migrations.** `jpa.hibernate.ddl-auto: update` in `person-service.yml` and `user-service.yml`, with no Flyway or Liquibase anywhere. Development convenience, but there is no repeatable, reviewable schema history; introducing a migration tool is a decision to make deliberately.
- **Local runtime prerequisites.** Every service expects **Consul on `localhost:8500`** and, for the config-driven ones, `config-service` on **:8888**. `person-service` expects MySQL `persons_schema` on **:3306** and `user-service` expects `users_schema` on **:3307**. `person-service`, `user-service` and `notification-service` set `server.port: 0`, so their ports are assigned at startup and discovered through Consul — do not hardcode them in tooling or documentation.
- **Only two services are containerized.** `Dockerfile` exists for `person-service` and `user-service` only; there is no `docker-compose`, so Consul and MySQL must be started by hand.
- **Actuator exposure.** `config-service` sets `management.endpoints.web.exposure.include: "*"`, and the same wildcard is delivered to `gateway-service`, `person-service`, `user-service` and `notification-service`. None of those services adds Spring Security, so every reachable actuator endpoint—including `/env` and `/heapdump`—is currently unauthenticated. Verify before exposing any service beyond localhost.
- **Secrets are currently inline in committed YAML** (an RSA private key, an SMTP app password, MySQL and Spring Boot Admin credentials, a JWT secret fallback). See `project_init.md → ## Open Gaps`; until they are rotated and externalised, treat every `src/main/resources/**.yml` value as a live credential, never as a safe example to copy.
- **Frontend is planned, not present.** The `fullstack` role is recorded in `metadata.json`, but no UI module exists yet; nothing in this file should be read as pre-committing a frontend stack.

---

## Architecture Overview

### Architecture Pattern

**Microservices** — 8 independently packaged Spring Boot applications under one Maven aggregator (`pro.algotrade:algo-trade-platform:1.0`): `gateway-service`, `auth-service`, `config-service`, `admin-service`, `person-service`, `user-service`, `account-service`, `notification-service`. Phase 4 classifies the practical runtime shape as **7 deployable modules plus 1 non-running scaffold** (`account-service`), with `auth-service` also presently functioning as an inert authentication scaffold.

### Key Architectural Decisions

- **Single reactive edge.** `gateway-service` (Spring Cloud Gateway, port 3535) is the only north-south entry point; it routes to services resolved through Consul, so downstream services do not publish stable ports (`server.port: 0` on three of them). Phase 4 corrected the Phase 3 assumption: the gateway does **not** validate JWTs. Its Spring Security/JWT dependencies are commented out, and `AuthFilter` merely calls an external token-validation endpoint.
- **Centralised configuration.** `config-service` (Spring Cloud Config, port 8888) runs with `spring.profiles.active: native` and serves the checked-in YAML files under `config-service/src/main/resources/config/` — the per-service runtime configuration therefore lives **inside this repository**, not in an external config repo. It serves only `gateway-service`, `notification-service`, `person-service` and `user-service`; `auth-service`, `admin-service`, `account-service` and `config-service` use local configuration. A Git-backed configuration block (`spring.cloud.config.server.git` pointing at `git@github.com:aleksandrbortsov/config-repo.git` with an SSH deploy key) is present but **entirely commented out**, which is what the README's `ssh-keygen` instructions still describe.
- **Dedicated authorization server — planned, not currently active.** `auth-service` (port 9000) is intended to issue tokens via Spring Authorization Server, but the dependency and all authorization-server/security/JWT-signing beans are commented out; `/auth/login` currently returns the literal string `token`. Treat authentication as unresolved until the user confirms the canonical mechanism.
- **Database-per-service, partially.** `person-service` and `user-service` each own a MySQL schema (`persons_schema`, `users_schema`); `auth-service` and `account-service` also carry JPA + MySQL dependencies. Phase 4 corrects that to **declared-but-inactive**: `auth-service` has both commented out, while `account-service` has no datasource and cannot boot. `notification-service` and `config-service` are stateless.
- **Operability before tests.** Observability is comparatively mature for a codebase this size — Spring Boot Admin server plus clients, Actuator, Logback file rolling with size and history caps — while automated tests are almost absent (2 classes). The practical consequence for agents: verification of a change here is currently manual and runtime-based, which is why the TDD policy question in Phase 6 matters.

### Data Flow Strategy

Synchronous **REST/JSON over HTTP** between the browser or API client and `gateway-service`, which forwards to individual services by service-id through Consul discovery. Jackson is configured with `default-property-inclusion: NON_NULL` (`auth-service`). Email is the only outbound integration today, via SMTP in `notification-service`. The Phase 4 mechanism is confirmed: the only live inter-service caller is `user-service`, which uses a bare `RestTemplate` against the gateway URL to reach `person-service`; `gateway-service` uses reactive `WebClient` for token validation. `person-service` makes no outbound calls, and no OpenFeign client is active anywhere.

---

## Dependency & Pattern Governance

> Applies to all agents. Full protocol is defined in [orchestrator.md — Agent Behavioral Principles](orchestrator.md).

| Change Type | Required Action |
|-------------|----------------|
| New runtime dependency | Explicit user approval — state what it does, why existing deps can't cover it, and alternatives |
| New dev/build tooling | Discussion with user — state impact on build pipeline and developer workflow |
| New architectural pattern not already in codebase | Discussion with user — state trade-offs vs. existing patterns |
| New framework plugin or major version upgrade | Discussion with user — state migration effort and breaking changes |
| New APM package added to project's `apm.yml` | Discussion with user — state what the package adds (agents, skills, prompts, MCP), `x-workplace.type`, and any runtime folder it relocates (full modules). Re-run `apm install` after editing. The lockfile (`apm.lock.yaml`) MUST be committed. |

When in doubt whether a new dependency or pattern is needed, **ask the user first** with full reasoning before proceeding.

---

## Related Documentation

- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [docs/INDEX.md](../../docs/INDEX.md) - Central documentation index
- [README.md](../../README.md) - Project overview
- [.opencode/project_init.md](../project_init.md) - Initialization configuration
- [orchestrator.md](orchestrator.md) - Workflow orchestration and command routing

---

## Changelog

<!-- Auto-populated during initialization -->

| Date | Change | Phase |
|------|--------|-------|
| 2026-11-09 | Initial configuration — stack detected from 9 `pom.xml` files and `src/main/resources/**` | Phase 3 |
| 2026-11-09 | Phase 4 component analysis corrected auth, gateway, persistence, wrapper and runtime-service findings | Phase 4 |
| 2026-11-09 | Core domain guidelines rendered for coding and infrastructure; TDD policy set to `recommended`; additional domain-context packages declined | Phase 6 |

> **Template v5.0.0** (2026-09-03): OpenCode line — port of the Cursor-line 4.8.0 template to OpenCode 1.18.27 and the APM 0.28.0 `opencode` target. Release notes: CHANGELOG.md (this line starts at 5.0.0).
