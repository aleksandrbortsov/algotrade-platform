# AGENTS.md

> Instructions for AI coding agents working on this project.
> See https://agents.md for the open standard.

## Project Resource Map (read first)

> **For AI agents — canonical entry points before any work.** Consult these in order; first hit wins for project-specific facts.

1. **[`docs/INDEX.md`](docs/INDEX.md)** — auto-generated central index of every documentation and rule file in this repository (regenerated on every `/initialize` / Phase 7.5). **Use this to discover any other resource by topic** instead of guessing paths.
2. **[`.opencode/rules/development.md`](.opencode/rules/development.md)** — single source of truth for the technology stack (always loaded into agent context).
3. **[`.opencode/project_init.md`](.opencode/project_init.md)** — compact initialization ledger (state, artifact pointers, **Supplemental Source Manifest**, **User Answers & Decision Log**).
4. **`.opencode/skills/*/references/guidelines.md`** — active domains are `coding-standards-context` and `infrastructure-context`.
5. **[`.opencode/rules/.core-version.json`](.opencode/rules/.core-version.json)** — template version + applied migrations.

> Do NOT search ad-hoc when `docs/INDEX.md` exists — it is the navigation hub for the project.

## Do
- Always respond, explain and communicate in Russian language only.
- Search for existing controller, service, mapper, repository or exception patterns before adding types.
- Use Lombok `@RequiredArgsConstructor` with `final` constructor injection.
- Keep DTO conversion at controllers using the module's `*Mapper` pattern.
- Prefer inherited Java 17 over stale module-level Java 10 pins.
- Use Conventional Commits: `feat(user-service): add focused validation`.

## Don't

- Don't introduce `jakarta.*` or Spring Boot 3 syntax while this platform uses Boot 2.7 / `javax.*`.
- Don't copy committed credentials into new code, tests or documentation.
- Don't treat `auth-service` as active or `account-service` as functional.
- Don't add JWT, OpenFeign, OpenAPI, Flyway, Kafka or another client pattern without approval.
- Don't expose wildcard actuator paths or Consul-discovered ports as public contracts.

## Architecture (TL;DR)

- Eight Spring Boot 2.7.5 modules in one Maven reactor.
- `gateway-service` is the reactive Consul-discovery edge on port 3535.
- `config-service` serves checked-in native YAML to four centrally configured services.
- `user-service` and `person-service` are the active JPA/MySQL services.
- `auth-service` is inert, `account-service` is a scaffold, and notification is scheduler-driven.

→ See [development.md](.opencode/rules/development.md#architecture-overview).

## Constraints & Non-Goals

- Java 17 parent target coexists with four Java 10 compiler pins.
- Only manual local runtime exists: Consul, MySQL and SMTP are external prerequisites.
- Authentication, account ownership and the Person/User boundary remain undecided.
- Committed credentials are public until user-owned rotation and history remediation.
- No frontend, CI, staging, production, deployment or performance target exists.

→ See [coding](.opencode/skills/coding-standards-context/references/guidelines.md) and [infrastructure guidelines](.opencode/skills/infrastructure-context/references/guidelines.md).

## Commands

```powershell
# From the owning module
.\mvnw.cmd test
.\mvnw.cmd -Dtest=ClassName test
.\mvnw.cmd clean package
```

Root reactor: `mvn clean package` — ask first. No lint or format command is configured.

## Safety and Permissions

**Allowed:** read/list files, inspect configuration, compile or test one targeted module.
**Ask first:** Maven dependencies, push, deletion, full builds/runtime integration, ports, routes, security, secrets.

## Project Structure

- `gateway-service/`, `auth-service/` — edge and inert authentication scaffold
- `user-service/`, `person-service/` — active MySQL/JPA services
- `account-service/`, `notification-service/` — scaffold and SMTP scheduler
- `config-service/`, `admin-service/` — configuration and monitoring
- `config-service/src/main/resources/config/` — service YAML and gateway routes
- `.opencode/project/analysis/` — endpoint, entity, dependency and runtime evidence

## Testing

TDD is `recommended` with JUnit 5, Mockito, AssertJ and MockMvc. Start from a focused failing test where practical; no coverage threshold or CI gate exists.

## Security Considerations

- Treat `src/main/resources/**` credentials as live until rotation and externalization.
- Never log PII, tokens, QR secrets, passwords or admin credentials.
- Validate and sanitize external input before service or database access.
- Narrow actuator and network exposure before any non-local deployment.

## Project Conventions

> Repo-wide team conventions belong here. Link rendered context-skill guidelines instead of duplicating domain rules.

> _No team-wide conventions documented yet._

## Additional Resources

- **[docs/INDEX.md](docs/INDEX.md)** — Central documentation index (start here; regenerated in Phase 7.5)
- [Development Rules](.opencode/rules/development.md)
- [Coding Guidelines](.opencode/skills/coding-standards-context/references/guidelines.md)
- [Infrastructure Guidelines](.opencode/skills/infrastructure-context/references/guidelines.md)
- [TaskMaster Workflow](.opencode/rules/taskmaster/dev_workflow.md)

## Package Instructions (managed by APM)

> The region between the markers below is owned by `apm compile`. Preserve the markers and their contents during Phase 7 and Workplace updates.

<!-- apm:start -->
<!-- apm:end -->

---

*Generated by Full Initialization.*
