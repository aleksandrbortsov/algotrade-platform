# Infrastructure Guidelines

> **Component Rule:** This file contains detailed infrastructure and DevOps guidelines for the project.
>
> **Related:** See [development.md](../../../rules/development.md) for high-level architecture overview.

---

## Infrastructure Configuration

- **Cloud Provider:** None configured
- **Container Platform:** Docker is available only through single-stage `person-service/Dockerfile` and `user-service/Dockerfile`; both require a pre-built JAR and are not part of a build pipeline.
- **Orchestration:** None — no Kubernetes manifests, Helm chart, Compose file or Terraform configuration exists.
- **CI/CD Tool:** None — no GitHub Actions, GitLab CI, Jenkinsfile, Azure Pipelines, CircleCI or other pipeline definition exists.
- **Service discovery:** HashiCorp Consul at `localhost:8500`, required by seven of eight modules; `account-service` does not register with Consul.
- **Central configuration:** Spring Cloud Config at `localhost:8888`, using the native classpath backend.

---

## Deployment Strategy

### Deployment Method

The repository describes a manual local runtime, not an automated deployment:

1. Start Consul on `localhost:8500`.
2. Start `config-service` on `localhost:8888`.
3. Provision MySQL schemas:
   - `persons_schema` on `localhost:3306`
   - `users_schema` on `localhost:3307`
4. Start Spring Boot JARs or run modules through their per-module Maven wrappers.
5. Register business services with Consul and resolve their ports through discovery.

`person-service`, `user-service` and `notification-service` use `server.port: 0`, so downstream clients and gateway routes must resolve instances through Consul rather than assume stable ports.

### Environment Strategy

Only `dev-local` is expressible from the committed files. It is a development/local runtime with these configuration paths:

- Central configuration documents under `config-service/src/main/resources/config/`
- Local configuration in modules that do not import the config service
- `CONFIG_SERVER`, `ADMIN_SERVER` and `APP_JWT_SECRET` environment-variable overrides where present
- No staging, production, pre-production or isolated QA environment definition

Do not describe `dev-local` as staging or production. There is no promotion path, environment inventory or environment-scoped secret store.

### Release Process

No release process is configured. There are no artifact registry settings, release tags, deployment manifests, health-check gates, rollback steps or approval workflow. A future release process must be designed explicitly rather than inferred from the existing Dockerfiles.

---

## CI/CD Pipeline

### Pipeline Stages

None are configured. A future pipeline should at minimum separate:

1. Maven compilation
2. Unit and integration tests
3. Configuration validation
4. Image build and scan
5. Deploy to a disposable environment
6. Smoke and health verification

### Build Process

The current build path is Maven:

```powershell
.\mvnw.cmd clean package
```

Run the command from the module being built. Each module contains its own Maven wrapper. A reactor build from the repository root uses the system Maven installation because no root wrapper is committed.

Do not assume a clean build succeeds for all eight modules:

- `account-service` declares JPA but has no datasource and cannot boot as configured.
- Several modules pin compiler source/target to Java 10 while the parent declares Java 17.
- The only tests are a stale controller test in `auth-service` and a context-load test in `config-service` that expects Consul.

### Automated Tests

`mvn test` is available, but there is no automated pipeline to run it, enforce results, publish reports or block a merge. Coverage is not configured and effective test coverage is near zero.

### Deployment Triggers

No deployment trigger exists. Changes are run manually from a developer workstation.

---

## Containerization

### Docker Configuration

Only two service-level Dockerfiles exist:

- `person-service/Dockerfile`
- `user-service/Dockerfile`

Both are single-stage and expect an already-built JAR. They expose port `8080`, while these services are configured to use random ports. There is no Docker Compose or build orchestration.

Before making either Dockerfile useful, define:

- A deterministic base image and JDK version
- Multi-stage build or an explicit artifact contract
- Port handling that matches the runtime discovery model
- Spring Boot profile and configuration-service URL
- Healthcheck and graceful shutdown behavior
- Runtime user, resource limits and log destination

### Image Management

No image registry, image naming scheme, tagging strategy, retention policy or signing process is configured. Do not invent or publish image coordinates without approval.

### Container Security

Container security is not configured. Review base-image provenance, image scanning, non-root runtime user, secret mounts, resource limits and network exposure before any deployment beyond localhost. Do not bake committed YAML credentials into an image.

---

## Environment Management

### Environment Types

| Environment | Status | Notes |
|---|---|---|
| `dev-local` | Only currently supported environment | Consul, MySQL, SMTP and services started manually |
| `test` | Not configured | No isolated runtime, fixtures, CI or QA environment |
| `staging` | Not configured | `metadata.json` still reports this as TBD |
| `production` | Not configured | `metadata.json` still reports this as TBD |

### Configuration Management

- Configuration service root: `config-service/src/main/resources/config/`
- Central config consumers: `gateway-service`, `notification-service`, `person-service`, `user-service`
- Local config consumers: `auth-service`, `admin-service`, `account-service`, `config-service`
- Config service uses `spring.profiles.active: native` and serves checked-in classpath YAML; it does not fetch from Git at runtime.
- Gateway routes are authored in `config-service/src/main/resources/config/gateway-service.yml`, not in `gateway-service/src/main/resources`.
- The Git-backed config-server block is present but commented out. Do not follow the README as though it is active.
- Consul host and port are hardcoded to `localhost:8500`; adding an environment override should be treated as an infrastructure change.

Use the existing environment-variable pattern for deploy-time values:

```yaml
config-server: ${CONFIG_SERVER:http://localhost:8888}
admin-server: ${ADMIN_SERVER:http://localhost:5555}
jwt-secret: ${APP_JWT_SECRET:}
```

The default for `APP_JWT_SECRET` currently exists in committed configuration; do not reproduce the literal secret in documentation or new files.

### Secrets Management

Secrets are currently committed across YAML and properties files, including database, Spring Boot Admin, SMTP, JWT and signing-related values. They have been pushed to a public GitHub repository.

Until rotation and externalization are completed:

1. Treat every value in `src/main/resources/**` and module properties files as a live credential.
2. Copy only property names, not values, into code, docs, logs, tests and examples.
3. Use environment variables or a secret manager for new configuration values.
4. Do not commit logs or generated configuration files that contain resolved values.
5. Do not expose actuator endpoints while `/env`, `/configprops` and related endpoints remain unauthenticated.
6. Consider committed logs under `config-service/logs/` potentially sensitive until reviewed and ignored.

The committed Git SSH configuration block and GitHub config-repo reference are also subject to this rule and should be rotated or removed by the owner.

---

## Monitoring & Observability

### Monitoring Tools

- Spring Boot Admin server on `localhost:5555`
- Spring Boot Admin clients and Actuator in participating services
- Consul health registration, though `register-health-check: false` is delivered in every service

### Logging Strategy

Each service writes rolling files under a working-directory `logs/` root. The project uses Logback file rolling with size/history limits, but four delivered configuration documents still use the deprecated `logging.file.max-size` and `logging.file.max-history` keys.

There is no centralized log aggregator, correlation-id policy, retention policy or secure log destination. `person-service` logs personal data at INFO level; treat log output as potentially containing PII.

### Alerting Rules

No alerting system, threshold, escalation path or on-call process is configured.

### Metrics Collection

Actuator exposes runtime endpoints, but no Prometheus registry, metrics exporter, dashboard, SLO or retention target is configured. Current wildcard actuator exposure is an unauthenticated security issue, not an observability deployment.

---

## Scaling

### Scaling Strategy

No platform scaling strategy is configured. Spring Cloud LoadBalancer and gateway `lb://` URIs support multiple instances in principle, but no resource limits, replica counts, autoscaling rules or deployment target exist.

### Load Balancing

The only load-balancing configuration is the gateway's `lb://user-service` style URI plus Consul lookup. There is no reverse proxy, ingress, TLS termination, CDN or external load balancer.

### Auto-scaling Rules

Not configured.

---

## Disaster Recovery

### Backup Strategy

No database backup, restore script, retention schedule or artifact backup process is configured. Hibernate `ddl-auto: update` owns schema changes for `persons_schema` and `users_schema`, so there is no reliable migration artifact to restore from.

### Recovery Procedures

No documented recovery procedure or rollback path exists. Restarting local services is currently the only implicit recovery action.

### RTO/RPO Targets

No Recovery Time Objective or Recovery Point Objective has been defined.

---

## Security

### Network Security

All runtime services are designed to be reachable on localhost or the host network:

- `gateway-service`: 3535
- `auth-service`: 9000
- `config-service`: 8888
- `admin-service`: 5555
- Consul: 8500
- MySQL: 3306 and 3307
- business services: random assigned ports

No firewall, ingress, TLS, mTLS, service mesh, internal-network segmentation or reverse proxy is configured. Do not expose these ports beyond localhost until authentication, actuator exposure and credentials are addressed.

### Access Control

- `config-service` is unauthenticated and exposes wildcard actuator paths.
- Central and local application configuration contain credentials.
- `user-service` currently uses `anyRequest().permitAll()`.
- Spring Boot Admin uses one committed credential pair and binds to all interfaces.
- `auth-service` does not currently run the Spring Authorization Server configuration represented in its commented code.
- `account-service` is a non-running scaffold and must not be counted as a protected service.

### Compliance

No formal compliance framework was selected. The project still handles personal PII and TOTP-related data, and the Phase 5 compliance answer is an Open Gap. Do not claim GDPR, PCI DSS, SOC 2, HIPAA or other compliance coverage.

---

## Agent Instructions

> **For AI agents:** Follow these instructions when working with infrastructure and DevOps tasks.

### Before Making Infrastructure Changes

1. Confirm the task is changing the only supported local environment and not implicitly introducing a deployment target.
2. Check whether the setting belongs in `config-service/src/main/resources/config/` or in a local module configuration file. Remember that gateway routes belong in the config-service document.
3. Review the existing Consul, MySQL and Spring Cloud Config prerequisites before changing a service runtime or port.
4. Check both central and local configuration consumers; four services do not import `config-service`.
5. Do not modify a Dockerfile assuming a deployment pipeline, registry or orchestrator exists.
6. Do not enable a Git config-server block, external port, actuator endpoint or credential without explicit approval.

### After Making Infrastructure Changes

> **Update policy:** This document MUST be updated when any of the following occur:

1. New environment added or environment strategy changed → update Environment Management
2. CI/CD pipeline stages modified → update CI/CD Pipeline section
3. Container configuration or image management changed → update Containerization
4. Monitoring tools, alerting rules or logging strategy changed → update Monitoring & Observability
5. Cloud provider, orchestration or container platform changed → update Infrastructure Configuration
6. Scaling or load-balancing rules changed → update Scaling section
7. Backup strategy or RTO/RPO targets revised → update Disaster Recovery
8. Ask user to confirm documentation updates before finalizing

### When User Asks About Environments or Deployment

1. First check this document for the current configuration
2. If not found here, check configuration, Docker and runtime files — then propose adding the finding here
3. Do NOT add new environment variables or deployment steps without checking existing patterns

---

## Related Rules

- [development.md](../../../rules/development.md) - Architecture overview
- [Analysis index](../../../project/analysis/index.json) - Current Phase 4 component findings
- [config-service analysis](../../../project/analysis/config-service.json) - Configuration, logging and delivery details
- [admin-service analysis](../../../project/analysis/admin-service.json) - Monitoring and client registration details

---

## Notes

- Infrastructure is local-first and not deployable as a cohesive platform: seven deployable modules plus one scaffold, two Dockerfiles, no Compose, no orchestrator, no CI/CD and no real staging or production environment.
- The active config service uses classpath files, despite the older external Git configuration repository being documented in the README.
- `server.port: 0` and Consul service discovery make stable business-service ports unavailable.
- P0 credential exposure and public repository history remain an owner-owned remediation gap.
