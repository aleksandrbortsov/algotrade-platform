# Infrastructure Guidelines

> **Component Rule:** This file contains detailed infrastructure and DevOps guidelines for the project.
> 
> **Related:** See [development.md](../../../rules/development.md) for high-level architecture overview.

---

## Infrastructure Configuration

- **Cloud Provider:** {{CLOUD_PROVIDER}}
- **Container Platform:** {{CONTAINER_PLATFORM}}
- **Orchestration:** {{ORCHESTRATION}}
- **CI/CD Tool:** {{CICD_TOOL}}

---

## Deployment Strategy

### Deployment Method

{{DEPLOYMENT_METHOD}}

### Environment Strategy

{{ENVIRONMENT_STRATEGY}}

### Release Process

{{RELEASE_PROCESS}}

---

## CI/CD Pipeline

### Pipeline Stages

{{PIPELINE_STAGES}}

### Build Process

{{BUILD_PROCESS}}

### Automated Tests

{{AUTOMATED_TESTS}}

### Deployment Triggers

{{DEPLOYMENT_TRIGGERS}}

---

## Containerization

### Docker Configuration

{{DOCKER_CONFIG}}

### Image Management

{{IMAGE_MANAGEMENT}}

### Container Security

{{CONTAINER_SECURITY}}

---

## Environment Management

### Environment Types

{{ENVIRONMENT_TYPES}}

### Configuration Management

{{CONFIG_MANAGEMENT}}

### Secrets Management

{{SECRETS_MANAGEMENT}}

---

## Monitoring & Observability

### Monitoring Tools

{{MONITORING_TOOLS}}

### Logging Strategy

{{LOGGING_STRATEGY}}

### Alerting Rules

{{ALERTING_RULES}}

### Metrics Collection

{{METRICS_COLLECTION}}

---

## Scaling

### Scaling Strategy

{{SCALING_STRATEGY}}

### Load Balancing

{{LOAD_BALANCING}}

### Auto-scaling Rules

{{AUTOSCALING_RULES}}

---

## Disaster Recovery

### Backup Strategy

{{BACKUP_STRATEGY}}

### Recovery Procedures

{{RECOVERY_PROCEDURES}}

### RTO/RPO Targets

{{RTO_RPO_TARGETS}}

---

## Security

### Network Security

{{NETWORK_SECURITY}}

### Access Control

{{ACCESS_CONTROL}}

### Compliance

{{COMPLIANCE}}

---

## Agent Instructions

> **For AI Agents:** Follow these instructions when working with infrastructure and DevOps tasks.

### Before Making Infrastructure Changes

1. ✅ Review Deployment Strategy — understand current deployment method and release process
2. ✅ Check Environment Management — know all environment types and secrets management approach
3. ✅ Review CI/CD Pipeline stages before adding new steps
4. ✅ Check Container Security rules before modifying Dockerfiles
5. ✅ Review Scaling Strategy before changing resource limits or auto-scaling rules

### After Making Infrastructure Changes

> **Update Policy:** This document MUST be updated when any of the following occur:

1. 📝 New environment added or environment strategy changed → update Environment Management
2. 📝 CI/CD pipeline stages modified → update CI/CD Pipeline section
3. 📝 Container configuration or image management changed → update Containerization
4. 📝 Monitoring tools, alerting rules, or logging strategy changed → update Monitoring & Observability
5. 📝 Cloud provider, orchestration, or container platform changed → update Infrastructure Configuration
6. 📝 Scaling or load balancing rules changed → update Scaling section
7. 📝 Backup strategy or RTO/RPO targets revised → update Disaster Recovery
8. 📝 Ask user to confirm documentation updates before finalizing

### When User Asks About Environments or Deployment

1. 🔍 **FIRST** check this document for the current configuration
2. 🔍 If not found here, check CI/CD config files — then propose adding to this document
3. ❌ **DO NOT** add new environment variables or deployment steps without checking existing patterns

---

## Related Rules

- [development.md](../../../rules/development.md) - Architecture overview
- [Backend Skill](../../backend-context/SKILL.md) - Application configuration
- [Testing Skill](../../testing-context/SKILL.md) - CI testing integration

---

## Notes

{{ADDITIONAL_NOTES}}
