# config-service — infrastructure analysis

**Component:** `config-service` · **kind:** `infra` (configuration-delivery plane, not a product service)
**Coverage:** `partial` (see §H) · **Files read:** 11 of 16 in the module — 10 opened in full (`application.yml`, the 4 delivered documents, `pom.xml`, the 2 Java classes, `.mvn/wrapper/maven-wrapper.properties`, `config-service.iml`) plus `logs/config-service.log` read by targeted pattern search only. Unread: `mvnw`, `mvnw.cmd`, `maven-wrapper.jar` (binary), and the 2 rotated `.gz` logs.
**Role in the platform:** the Spring Cloud Config Server that hands 4 of the 8 modules their runtime configuration. Its `src/main/resources/config/*.yml` files are the repository's densest source of truth about the other services.

Module inventory (16 files): `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.{jar,properties}`, `config-service.iml`, 1 production Java class, 1 test class, 5 YAML files (`application.yml` + 4 delivered documents), 3 log artifacts under `logs/`.

---

## A. Containers

**none.** No `Dockerfile`, `Containerfile`, `*.dockerfile` or `docker-compose*` exists anywhere under `config-service/` (glob over the whole component: 0 hits). `spring-boot-maven-plugin` (`config-service/pom.xml:55-58`) repackages an executable jar and that jar is the only deployable artifact.

Contrast worth recording: `person-service/Dockerfile` and `user-service/Dockerfile` are the repository's only two container definitions (`git ls-files`, filenames only — contents not read, they are out of scope), and there is **no** compose file anywhere, so config-service plus Consul plus two MySQL instances must all be started by hand.

## B. Orchestration

**none.** No Kubernetes manifests, no Helm chart (`Chart.yaml`/`values.yaml`), no Terraform (`*.tf`). The only `.yml` files in the component are Spring application configuration under `src/main/resources/`. Effective deploy target: a developer workstation, `java -jar`, `localhost` for every dependency.

## C. CI / CD

**none — stated plainly: there is no pipeline for this component, and there is no pipeline anywhere in the repository.** No `.github/workflows`, no `.gitlab-ci.yml`, no `Jenkinsfile`, no `.circleci`, no `azure-pipelines.yml` under `config-service/`, and the full repository listing from `git ls-files` contains no CI file at all. Consequence: this module — which decides what every other service runs with — has never been built or tested automatically, and nothing would notice a broken delivered document. Build entry points are `config-service/mvnw` (Maven 3.8.6 distribution, wrapper 3.1.0 — `.mvn/wrapper/maven-wrapper.properties:1-2`) and the aggregator reactor.

## D. Environments & deploy targets

### The `native` profile

`config-service/src/main/resources/application.yml:21-22` sets `spring.profiles.active: native`. Confirmed at runtime by the committed log: `config-service/logs/config-service.log:2` — `The following 1 profile is active: "native"`.

`native` selects **Spring Cloud Config's classpath backend**: documents are read from the packaged `config/` directory *inside this module's own jar* (default native search location `classpath:/config/`, plus `file:./config/`). No `spring.cloud.config.server.native.search-locations` override exists in the module, so the default is what applies. **Operational meaning: the runtime configuration of the platform is versioned inside this repository and shipped in the config-service jar — it is not fetched from any remote at boot.** Changing a service's configuration therefore means rebuilding/redeploying config-service (or writing to `file:./config/` on the host), not pushing to a git repo. A restart or a `/refresh`-driven re-read is required; nothing polls a remote.

Documents are named after each consumer's `spring.application.name` with **no profile suffix** (`gateway-service.yml`, not `gateway-service-dev.yml`), so a single document serves every profile of that service. There is no `application-<profile>.yml` and no `-dev`/`-test`/`-prod` variant: **dev is the only environment this module can express.**

### The commented git backend (`application.yml:36-98`)

A git-backed config repository is **DECLARED BUT ENTIRELY COMMENTED OUT**. Line by line:

| Line | Declared (commented) key |
|---|---|
| 36 | `# create new SSH key on https://github.com/settings/keys` (instruction comment) |
| 37-38 | `# server:` → `# bootstrap: true` |
| 39 | `# git:` |
| 40 | `# uri: file:///C:\Projects\Trainings\config-repo` — a **local `file://` alternative** on the author's machine |
| 41 | `# uri: git@github.com:aleksandrbortsov/config-repo.git` |
| 42 | `# default-label: main` |
| 43 | `# ignoreLocalSshSettings: true` |
| 44 | `# hostKeyAlgorithm: ssh-rsa` |
| 45 | `# hostKey: algotrade` (not a valid SSH host key — this block would not have worked as written) |
| 46-97 | `# privateKey: |` followed by **commented-out key material** — a full RSA private key (`plaintext RSA private key present`); see §SECRET LOG |

Two `uri:` keys sit at the same YAML level (lines 40, 41), i.e. even uncommented only the last would survive — the block is scratch work left in the file.

**Operational consequence.** The project README still instructs users to run `ssh-keygen` and register a GitHub deploy key, but **the code as committed uses no SSH key and never contacts a git remote**. Anyone following the README performs a step with no effect, and the deploy key that *was* generated (and the one committed in the comment) should both be treated as live-but-orphaned credentials. The stale README and the committed key are the same defect viewed from two sides.

### Overridable values (the only externalisation present)

- `${ADMIN_SERVER:http://localhost:5555/}` — `gateway-service.yml:22`, `notification-service.yml:23`, `person-service.yml:25`, `user-service.yml:25`
- `${APP_JWT_SECRET:<inline default>}` — `user-service.yml:59`
- `${spring.cloud.client.hostname}`, `${spring.application.name}`, `${random.value}` in `instance-id` — `application.yml:31` + 3 delivered documents
- **Nothing else is overridable.** Consul `localhost:8500` (5 files), MySQL `localhost:3306`/`localhost:3307`, SMTP `smtp.gmail.com:587`, and every `server.port` are hardcoded literals.

### Misplaced properties (finding)

`application.yml:32-35` sets `spring.cloud.config.allowOverride: true`, `overrideNone: true`, `overrideSystemProperties: false`. These are **client-side** `ConfigClientProperties` keys — they govern how a *consumer* merges the delivered document with its own sources, and setting them on the *server* does nothing for the four consumers. As written they are also self-contradictory (`allowOverride: true` alongside `overrideNone: true`). The commented `# bootstrap: true` (line 38) sits under `server:`, where no such server property exists. Flagged as **likely inert / wrong file**, not a confirmed defect — verifying needs a dependency-tree check (§H).

## E. Observability hooks

Exactly what is set, and the exposure scope:

| Property | Where | Value |
|---|---|---|
| `management.endpoints.web.exposure.include` | `application.yml:13-15` (server) **and** `gateway-service.yml:15`, `notification-service.yml:16`, `person-service.yml:18`, `user-service.yml:18` | `"*"` in all 5 |
| `management.endpoints.health.show-details` | the 4 delivered documents only (`gateway-service.yml:16`, `notification-service.yml:17`, `person-service.yml:19`, `user-service.yml:19`) | `always` — **not** set for config-service itself |
| `logging.file.name` | `application.yml:5-6` → `logs/config-service.log`; delivered → `logs/<service>.log` | writes into the module working directory |
| `logging.logback.rollingpolicy.max-file-size` / `.max-history` | `application.yml:8-11` (server only) | `10Mb` / `7` |
| `logging.file.max-size` / `logging.file.max-history` | all 4 delivered documents (`gateway-service.yml:7-8`, `notification-service.yml:7-8`, `person-service.yml:7-8`, `user-service.yml:7-8`) | `10Mb` / `7` under **deprecated** Boot-2.x key names — two incompatible rolling idioms in one component; the delivered caps are probably not applied |
| `logging.level.org.hibernate.SQL` / `.type.descriptor.sql` | all 4 delivered documents | `debug` / `trace` — SQL echo ON, incl. in `gateway-service.yml:9-11` and `notification-service.yml:10-12`, which have **no datasource**, so it is dead config there |
| `spring.jpa.show-sql` | `person-service.yml:30`, `user-service.yml:40` | `true` (second, independent SQL-echo switch) |
| `spring.boot.admin.client.url` | 4 delivered documents | `${ADMIN_SERVER:http://localhost:5555/}` |
| `spring.boot.admin.client.username` / `.password` | `application.yml:18-19` (server's own file) | set, **but no `url` key is set here** → config-service will not target admin-service on 5555; it falls back to the client default (high-confidence inference, §H) |
| admin credentials for delivered services | `user-service.yml:26-32` | commented-out `username`/`password` and `instance.metadata.user.*` |

**Exposure scope, stated plainly:** with `include: "*"` and no `management.endpoints.web.base-path` or security dependency anywhere in this component (`pom.xml:16-40` has no `spring-boot-starter-security`), *every* actuator endpoint is web-exposed **unauthenticated** — on the config server itself at `:8888` and, because the same setting is delivered, on the gateway at `:3535` and on the three random-port services. That includes `/env` and `/configprops`, which resolve and print exactly the plaintext credentials enumerated below.

**No metrics exporter**: `pom.xml` declares no Micrometer/Prometheus registry. Observability = Spring Boot Admin + Actuator + rolling file logs.

**Committed runtime logs:** `logs/config-service.log` (tracked) and `logs/config-service.log.2022-12-05.0.gz` (tracked) are in git; `logs/config-service.log.2023-06-21.0.gz` exists on disk untracked. There is **no `.gitignore` anywhere under `config-service/`** (person-service and user-service each have one), and `logging.file.name` points inside the working tree, which is how they got committed.

## F. Per-service configuration inventory (core deliverable)

All four files under `config-service/src/main/resources/config/`. Credentials are reported as **file + line + property name only** — see §SECRET HANDLING.

### `config/gateway-service.yml` (55 lines)
- `server.port: 3535` — the only delivered service with a **fixed** port (it is the edge).
- Datasource: **none** — no `spring.datasource`, no JPA block. Stateless.
- Consul: `host: localhost`, `port: 8500`, **`spring.cloud.consul.config.enabled: true`** (line 31-32 — unique to this file: the gateway also pulls config *from* Consul), `discovery.register-health-check: false` (34). **No `instance-id` override** — the only delivered file that omits it.
- Spring Boot Admin: `client.url: ${ADMIN_SERVER:http://localhost:5555/}` (22); no credentials.
- Actuator: `include "*"`, `health.show-details: always` (13-16).
- Logging: `logs/gateway-service.log`, `max-size 10Mb`, `max-history 7`, `org.hibernate.SQL debug`, `type.descriptor.sql trace` (4-11) — Hibernate levels on a service with no Hibernate.
- Jackson: `default-property-inclusion: NON_NULL` (24-25).
- **Gateway route definitions are authored HERE, not in the gateway** (36-54):
  `discovery.locator.enabled: true` + 3 routes —
  1. `auth-service-id` → `lb://auth-service`, `Path=/auth/**`, **no filter** (login must stay reachable);
  2. `user-service-id` → `lb://user-service`, `Path=/users/**`, filter `AuthFilter`;
  3. `person-service-in` (id typo, line 50) → `lb://person-service`, `Path=/persons/**`, filter `AuthFilter`.
  No route for `account-service` or `notification-service`. Because the discovery locator is enabled, those two are still implicitly reachable by service-id — the explicit route table is therefore **advisory, not an allow-list**, and `AuthFilter` is enforced per-route rather than globally. That is a security-relevant consequence of a configuration choice made in this file.

### `config/notification-service.yml` (56 lines)
- `server.port: 0` → **random port**, Consul-assigned.
- Datasource / JPA: **none** — consistent with a stateless mail relay.
- Consul: `localhost:8500`, `register-health-check: false`, `instance-id: "${spring.cloud.client.hostname}_${spring.application.name}:${random.value}"` (29-34). No `consul.config.enabled` key.
- Admin client url `${ADMIN_SERVER:http://localhost:5555/}` (23); actuator `include "*"` + `show-details: always` (14-17).
- Logging: `logs/notification-service.log`, deprecated caps 10Mb/7, Hibernate SQL `debug`/`trace` (10-12) — again no Hibernate here.
- Jackson `NON_NULL` (25-26).
- **Mail (the only outbound integration delivered):** `spring.mail.host: smtp.gmail.com` (37), `port: 587` (38), `username` (39), `password` (40) — credentials per §SECRET HANDLING; `properties.mail.smtp.auth: true` (46), `starttls.enable: true` (51-52). Commented alternatives: `connectiontimeout`/`timeout`/`writetimeout 5000` (47-49), `starttls.required` (53), and the SSL/465 variant `socketFactory.port` / `socketFactory.class javax.net.ssl.SSLSocketFactory` (54-56). **No SMTP timeouts are active** — a hung Gmail connection blocks the mail sender indefinitely.
- **No Kafka settings at all** in this document, while `git ls-files` shows `notification-service/src/main/java/.../listener/KafkaListenerService.java` (filename evidence only). Event-broker wiring must therefore live in the service's own `bootstrap.yml` — an example of the split in §F.5.

### `config/person-service.yml` (48 lines)
- `server.port: 0` → random.
- Datasource: `spring.datasource.url: jdbc:mysql://localhost:3306/persons_schema` (45), `driver-class-name: com.mysql.cj.jdbc.Driver` (48), `username` (46) + `password` (47) → §SECRET HANDLING.
- **Host:port `localhost:3306`, schema `persons_schema`.**
- JPA: `spring.jpa.hibernate.ddl-auto: update` (28-29), `show-sql: true` (30). **Schema is Hibernate-mutated, no Flyway/Liquibase delivered here.**
- Consul: `localhost:8500` (37-38), `register-health-check: false`, `instance-id` template (40-42).
- Admin client url (25); actuator `include "*"` + `show-details: always` (16-19); logging `logs/person-service.log` + deprecated caps (5-8) + Hibernate `debug`/`trace` (10-14); Jackson `NON_NULL` (32-33).
- No `security.user.*`, no mail, no JWT settings.

### `config/user-service.yml` (61 lines)
- `server.port: 0` → random.
- Datasource: `spring.datasource.url: jdbc:mysql://localhost:3307/users_schema` (52), `driver-class-name: com.mysql.cj.jdbc.Driver` (55), `username` (53) + `password` (54) → §SECRET HANDLING. **Host:port `localhost:3307` — a non-default MySQL port; two MySQL endpoints are expected in total (3306 + 3307) with nothing to start either.**
- JPA: `ddl-auto: update` (38-39), `show-sql: true` (40).
- Consul: `localhost:8500` (44-45), `register-health-check: false`, `instance-id` template (46-48).
- Admin client url (25) plus the commented admin-credential block (26-32).
- Actuator `include "*"` + `show-details: always` (16-19); logging `logs/user-service.log` + deprecated caps + Hibernate `debug`/`trace` (10-14); Jackson `NON_NULL` (34-35).
- **JWT (delivered to this service only):** `jwt.secret` (58-59) — env-overridable via `APP_JWT_SECRET` but with an inline default; code comment at line 57 reads `#secret key - should be encrypted`. `jwt.token.validity: 180000` (61) with comment `#3 minutes validity` — **the comment is wrong by a factor of 10: 180000 ms = 3 hours**, not 3 minutes. A token-lifetime policy documented incorrectly in the file that sets it.
- No mail, no `security.user.*`.

### F.5 — which services are configured here vs locally (finding)

| Service | Configured | Evidence |
|---|---|---|
| `gateway-service` | **centrally** (+ a local `bootstrap.yml`) | `config/gateway-service.yml`; `gateway-service/src/main/resources/bootstrap.yml` per `git ls-files` |
| `notification-service` | **centrally** (+ local `bootstrap.yml`) | `config/notification-service.yml` |
| `person-service` | **centrally** (+ local `bootstrap.yml`) | `config/person-service.yml` |
| `user-service` | **centrally** (+ local `bootstrap.yml`) | `config/user-service.yml` |
| `auth-service` | **locally only** | no file in `config/`; owns `auth-service/src/main/resources/application.yml` |
| `admin-service` | **locally only** | no file in `config/`; owns `admin-service/src/main/resources/application.yml` |
| `account-service` | **locally only** | no file in `config/`; owns `account-service/src/main/resources/application.properties` |
| `config-service` | **locally only** (self) | `config-service/src/main/resources/application.yml` |

**Finding — the configuration model is split 4/4, and nobody has written it down.** The four services configured here are exactly the four that are *called through* the gateway or *called by* a configured service; `auth-service`, `admin-service` and `account-service` are deliberately self-configured — plausibly because auth must be up **before** anything can fetch configuration (a genuine bootstrap-ordering constraint) and admin is the monitoring sink. But the consequence is real: **`:8888` is not authoritative for the platform**, so an operator who changes `config/user-service.yml` and restarts has changed 4 of 8 services, and the three local-config services use two different formats (`application.yml` vs `application.properties`). `account-service` is the extreme case — it appears in **neither** a delivered document **nor** a gateway route, so it is unreachable except via the gateway's implicit discovery locator. The sibling file *names* above come from `git ls-files` only; their contents were not read (out of scope).

## G. Cross-component evidence (from in-scope files only)

Recorded in the JSON under `crossComponentDependencies`, each with `via: "config-service/src/main/resources/config/<name>.yml"`. Inferences: `person-service` → random port + `persons_schema` on `localhost:3306` + `ddl-auto update`; `user-service` → random port + `users_schema` on `localhost:3307` + consumes the delivered `jwt.secret`/`jwt.token.validity`; `notification-service` → random port, stateless, SMTP relayed; `gateway-service` → fixed `3535`, Consul-config-enabled, stateless, route table owned by this module; `admin-service` → **expected on port 5555** because all four delivered documents register with `${ADMIN_SERVER:http://localhost:5555/}`; `auth-service` → reachable at `lb://auth-service` behind `/auth/**` with no `AuthFilter`; `account-service` → referenced nowhere. All 8 register (or are expected to register) in **Consul at `localhost:8500`** with `register-health-check: false`, so Consul holds no health verdict for any service in the fleet. Out-of-scope directories were not read.

## SECRET HANDLING (path · lines · property · form — no values, no fragments, no lengths)

| # | File | Lines | Property | Form |
|---|---|---|---|---|
| 1 | `config-service/src/main/resources/application.yml` | 18-19 | `spring.boot.admin.client.username` / `spring.boot.admin.client.password` | plaintext literal |
| 2 | `config-service/src/main/resources/application.yml` | 46-97 | `spring.cloud.config.server.git.privateKey` (inside the commented `server:` block, 37-98) | **commented-out key material — plaintext RSA private key present** |
| 3 | `config-service/src/main/resources/config/person-service.yml` | 46-47 | `spring.datasource.username` / `spring.datasource.password` | plaintext literal |
| 4 | `config-service/src/main/resources/config/user-service.yml` | 53-54 | `spring.datasource.username` / `spring.datasource.password` | plaintext literal |
| 5 | `config-service/src/main/resources/config/notification-service.yml` | 39-40 | `spring.mail.username` / `spring.mail.password` | plaintext literal |
| 6 | `config-service/src/main/resources/config/user-service.yml` | 58-59 | `jwt.secret` | plaintext literal (inline default of the `APP_JWT_SECRET` placeholder) |
| 7 | `config-service/src/main/resources/config/user-service.yml` | 26-32 | `spring.boot.admin.client.username` / `.password`, `spring.boot.admin.client.instance.metadata.user.name` / `.password` | commented-out credential properties |

Aggravating factors, all verified from the files above: (a) every one of these is **distributed at runtime** by an **unauthenticated** config server on `:8888`; (b) `management.endpoints.web.exposure.include: "*"` + `health.show-details: always` mean `/env` and `/configprops` re-emit them on 5 more services; (c) the delivered documents are packaged **inside the config-service jar**, so the jar is itself a credential store; (d) item 2 is committed in git history even though it is commented, so removal requires history rewriting, not a delete; (e) this module is the single worst secrets offender in the repository.

## H. Gaps / what could not be determined

1. **Committed logs not read in full** — `logs/config-service.log` (tracked) was inspected only by targeted pattern search (it proved `native` is active, gave the Consul stack traces, and the resolved versions `spring-cloud-consul-discovery-3.1.2` and `consul-api-1.4.5`); the two rotated `.gz` files (one tracked, one untracked) were not decompressed. **Whether the credentials above are reproduced in those logs is UNVERIFIED — not proven absent.** This is the only reason coverage is `partial`.
2. **Client-side bootstrap is out of scope** — how each consumer *locates* config-service (explicit `spring.cloud.config.uri` vs Consul discovery vs `bootstrap.yml` import) is decided in the four sibling `bootstrap.yml` files, so the delivery mechanism is inferred, not confirmed. It also determines whether the `overrideNone`/`allowOverride` flags matter at all.
3. **Property binding of `spring.cloud.config.allowOverride`/`overrideNone`/`overrideSystemProperties` on the server process** was not verified (needs a resolved-dependency-tree check — a build action outside this agent's read-only permission).
4. **Spring Boot Admin client default-URL behaviour** for config-service itself (username/password set, `url` absent) was not validated against the de.codecentric 2.7.x defaults.
5. **Sibling config contents unread** (auth/admin `application.yml`, account `application.properties`, the 4 `bootstrap.yml`), so what is *duplicated* locally vs delivered centrally is undetermined — only the existence/absence of a document is proven here.
6. **No git-history analysis** was run, so when the git block was commented out — and hence how long the README's deploy-key instructions have been stale — is undetermined.
7. **Spring Boot / Spring Cloud versions** are inherited from the aggregator pom (out of scope); only the two jar versions from the committed stack traces are confirmed inside this component.

## Recommendations (prioritised)

1. **Rotate + externalise** items 1, 3-6; **purge** item 2 from git history; **delete** the commented admin credentials (item 7). Pattern to copy: the existing `${APP_JWT_SECRET}` placeholder (minus its inline default).
2. **Pick one config source and make the docs agree.** If `native` stays, delete `application.yml:36-98` and rewrite the README's `ssh-keygen` section; if git is wanted, fix the block (duplicate `uri:` keys, `hostKey: algotrade` is not a host key) and keep the key out of the file.
3. **Close the actuator**: explicit endpoint allow-list instead of `"*"` in all 5 files, or at minimum gate `/env` and `/configprops`.
4. **Unify logging idiom** on `logging.logback.rollingpolicy.max-file-size` / `max-history`; the 4 delivered files use deprecated keys and likely ignore their own caps.
5. **Untrack `logs/`**, add `config-service/.gitignore`, move `logging.file.name` out of the working tree.
6. **Fix `jwt.token.validity`** — set the value or the comment so 180000 ms and "3 minutes" stop disagreeing; this is an auth-policy discrepancy.
7. **Add a real test**: `@SpringBootTest(RANDOM_PORT)` GETting `/gateway-service/default` and asserting `server.port: 3535` parses back. Today the module's sole test is an empty `contextLoads()` that emits `ERROR … Connect to localhost:8500 … Connection refused` unless Consul is running (`config-service/logs/config-service.log:9-25`) — i.e. the build has a hidden runtime dependency.
8. **Resolve the 4/4 split deliberately**: add `auth-service.yml`/`admin-service.yml`/`account-service.yml`, or state in `docs/` that those three are intentionally local-config, and record that `:8888` covers 4 services, not 8.
9. **Add an explicit `spring.cloud.config.server.native.search-locations`** and move the three config-client override flags out of the server's own file to the clients they govern.
10. **Fix the docs**: `.opencode/rules/development.md` states "No Maven wrapper is committed — use a local `mvn`", but `config-service/mvnw`, `mvnw.cmd` and `.mvn/wrapper/maven-wrapper.{jar,properties}` (Maven 3.8.6, wrapper 3.1.0) are committed — and are committed in every sibling module per `git ls-files`.
