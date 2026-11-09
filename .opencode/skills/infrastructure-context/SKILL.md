---
name: infrastructure-context
description: Infrastructure and DevOps patterns. Use when working with CI/CD pipelines, Docker, Kubernetes, cloud deployment, monitoring, environment management, or infrastructure as code.
---

# Infrastructure Specialist Skill

> Provides infrastructure development context, patterns, and project-specific configuration.

## Activation

This skill activates when:
- Working with files: `Dockerfile*`, `*.yml`, `*.yaml`, `docker-compose*`, `.github/**`, `k8s/`, `helm/`, `terraform/`
- Tasks involve: CI/CD pipelines, containerization, deployment, monitoring, cloud configuration, environment management
- Infrastructure Specialist agent is delegated infrastructure tasks

## Typical Tasks

- Writing and optimizing Dockerfiles (multi-stage builds, layer caching, security)
- Configuring CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Setting up Kubernetes manifests, Helm charts, and Kustomize overlays
- Implementing deployment strategies (blue-green, canary, rolling updates)
- Configuring environment management (staging, production, feature environments)
- Setting up monitoring and alerting (Prometheus, Grafana, Datadog, New Relic)
- Implementing infrastructure as code (Terraform, Pulumi, CDK)
- Configuring log aggregation and centralized logging
- Setting up secrets management (Vault, AWS Secrets Manager, sealed secrets)
- Designing disaster recovery and backup automation

## How to Use

1. **Read `references/guidelines.md`** — project-specific rendered reference (primary source, generated during initialization Phase 6)
2. **Read `project-config.json`** for structured configuration data
3. If `references/guidelines.md` does not exist: fall back to `references/template.md` + `project-config.json`
4. If `project-config.json` has `"initialized": false` (or `guidelines.md` missing): warn that initialization hasn't configured this domain — apply universal patterns from `references/template.md` only and suggest re-running initialization

## Files

| File | Purpose |
|------|---------|
| `references/guidelines.md` | **Project-specific guidelines** — rendered from template during initialization Phase 6 (primary agent reference) |
| `references/template.md` | Universal infrastructure patterns scaffold with `{{PLACEHOLDER}}` tokens (preserved for template updates) |
| `project-config.json` | Project-specific configuration (filled during initialization Phase 6) |

## Project Adaptation

During initialization Phase 6, the following project-specific details are collected and stored in `project-config.json`:

| Field | What It Captures | Example Values |
|-------|-----------------|----------------|
| `framework` | Primary IaC tool | Terraform, Pulumi, AWS CDK, Helm |
| `version` | Tool version | 1.7, 3.0 |
| `cloudProvider` | Cloud platform | AWS, GCP, Azure, DigitalOcean, on-premise |
| `cicdPlatform` | CI/CD system | GitHub Actions, GitLab CI, Jenkins, CircleCI |
| `containerization` | Container runtime | Docker, Podman, containerd |
| `orchestration` | Container orchestration | Kubernetes, ECS, Cloud Run, Docker Swarm |
| `deploymentStrategy` | Release strategy | Blue-green, canary, rolling, recreate |
| `monitoringStack` | Monitoring tools | Prometheus+Grafana, Datadog, New Relic, CloudWatch |
| `patterns` | Detected infra patterns | GitOps, trunk-based deployment, feature flags |
| `conventions` | Naming conventions | Environment prefixes, resource tagging |
| `constraints` | Infra constraints | Air-gapped, FedRAMP, specific cloud region |
| `projectSpecificNotes` | Additional context | Multi-region setup, hybrid cloud |

When applying patterns from `references/template.md`:
- If `project-config.json` has a value for a placeholder → use it
- If not → the placeholder represents a decision point to discuss with the user
