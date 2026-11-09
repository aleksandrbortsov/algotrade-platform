# admin-service — infrastructure analysis

- **Component:** `admin-service` (path `admin-service`, kind `infra`)
- **Generated:** 2026-11-10 · **Coverage:** `full` (every text file in the module opened) · **Files read:** 7 of 9
- **Module inventory (complete):** `pom.xml`, `src/main/resources/application.yml`, `src/main/java/pro/algotrade/adminservice/AdminServiceApplication.java`, `…/WebSecurityConfig.java`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`, `.mvn/wrapper/maven-wrapper.jar`, `admin-service.iml`. **No `src/test` directory, no `Dockerfile`.**

## 0. What this module is

A single-purpose **Spring Boot Admin (SBA) monitoring plane**. Two Java files total:

| File | Content |
|---|---|
| `AdminServiceApplication.java` (15 lines) | `@EnableAdminServer` (line 7) + `@SpringBootApplication` (line 8) + `main()` |
| `WebSecurityConfig.java` (54 lines) | `@Configuration @EnableWebSecurity` (16-17), one `SecurityFilterChain` bean (26-52) |

No controller, no service, no repository, no entity, no test. `entities[]` is empty by fact, not by omission.

## A. Containers

**none.** No `Dockerfile`, `Containerfile` or `.dockerignore` exists anywhere under `admin-service/` — a recursive listing of the module returns the 9 files above and nothing else. Phase 3 records container files only for `person-service` and `user-service`, which is consistent. Practical consequence: this service is started with `mvn spring-boot:run` or `java -jar target/admin-service-1.0.jar`, and its log path `logs/admin-service.log` is resolved against the **launch directory**, not a mounted volume.

## B. Orchestration

**none.** No Kubernetes manifest, no Helm chart, no Kustomization, no Terraform/OpenTofu file. A glob for `*.yaml`/`*.yml` under the module returns only `application.yml`.

Instances are addressed **only** through Consul service discovery: `spring.application.name: admin-service` (`application.yml:9`) is the service id; `spring-cloud-starter-consul-discovery` is on the classpath (`pom.xml:18-21`). No `instance-id`, `hostname`, `port`, `tags` or `scheme` override is set, so Consul discovery runs on library defaults.

## C. CI / CD

**none.** No `.github/`, no `.gitlab-ci.yml`, no `Jenkinsfile`, no build or deploy script inside this component. Nothing compiles, tests, scans or ships this module automatically. Consistent with the repo-level observation that no CI server is configured at all.

## D. Environments & deploy targets

| Item | Value | Evidence |
|---|---|---|
| `server.port` | **5555 — verified** | `src/main/resources/application.yml:1-2` |
| `server.address` | **not set** → binds `0.0.0.0` | absent from `application.yml` |
| `server.servlet.context-path` | not set; SBA context path resolved from `AdminServerProperties` (injected at `WebSecurityConfig.java:20`) → empty, UI at `/` | `WebSecurityConfig.java:32,36-48` |
| Spring profiles | **default only** — no `spring.profiles.active`, no `application-<profile>.yml`, no `bootstrap.yml` | only file present is `application.yml` |
| Consul host / port | `localhost` / `8500`, hardcoded | `application.yml:12-14` |
| Consul discovery | `spring.cloud.consul.discovery.register-health-check: false` | `application.yml:15-16` |
| Consul ACL / TLS | **not configured** (no `spring.cloud.consul.token`) | absence in `application.yml:11-16` |
| Config-server client | **absent** — no `spring-cloud-starter-consul-config`, no bootstrap file ⇒ this module does **not** pull config from `config-service` | dependency list `pom.xml:16-43` |
| Environment names present | **none.** `dev`, `prod`, `staging`, `qa`, `test`, `local` do not occur in any file under `admin-service/` | full-module keyword scan |
| Only host:port literals in module | `localhost:8500` (active) and `http://localhost:5555` (commented, `application.yml:27`) | `application.yml` |
| Build toolchain | Maven Wrapper committed **in this module**: wrapper 3.1.0, distribution `apache-maven-3.8.6` | `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties:1-2` |

So the only deploy target expressible in this module is *the developer machine* — Consul on `localhost:8500`, logs in a relative `logs/` directory, one profile.

## E. Observability hooks (core deliverable)

### E.1 Admin server activation and versions

- **`@EnableAdminServer`** is on `pro.algotrade.adminservice.AdminServiceApplication`, **line 7** (import `de.codecentric.boot.admin.server.config.EnableAdminServer`, line 3).
- `de.codecentric:spring-boot-admin-starter-server` is declared **without a version** (`pom.xml:28-31`) and inherits it from the BOM import `de.codecentric:spring-boot-admin-dependencies` keyed on **`${spring-boot-admin.version}`** (`pom.xml:55-61`). The property is defined in the root `pom.xml`, outside this brief's scope; Phase 3/the brief record **2.7.7**.
- `de.codecentric:spring-boot-admin-server-ui-login` (`pom.xml:33-37`) **is** explicitly versioned — `${spring-boot-admin-ui.version}` (brief value **1.5.7**), i.e. it is *not* taken from the BOM. That artifact is the **SBA 1.x-era standalone login-page UI jar**.
- **Is it wired? No.** The module has exactly two classes; neither imports anything from a `ui.login` package, and `WebSecurityConfig.java:39` points `formLogin` at `adminServer.getContextPath() + "/login"` — the **SBA 2.x server's own built-in login page**. The dependency is therefore **declared-but-unreferenced**, a residue of an earlier SBA 1.x setup, and it drags a second (1.x) UI jar onto a 2.7.x server. Removal candidate after a build check.

### E.2 Spring Security configuration (`WebSecurityConfig.java`)

Component-based style — `SecurityFilterChain` bean, no `WebSecurityConfigurerAdapter` (current Spring Security 5.7 idiom).

| Concern | Setting | Line |
|---|---|---|
| permitAll | `<ctx>/assets/**` and `<ctx>/login` | 36, 37 |
| all other requests | `anyRequest().authenticated()` | 38 |
| Form login | custom `loginPage(<ctx>/login)`; `SavedRequestAwareAuthenticationSuccessHandler`, `targetUrlParameter("redirectTo")`, `defaultTargetUrl(<ctx>/)` | 29-39 |
| Logout | `logoutUrl(<ctx>/logout)` | 40 |
| HTTP Basic | **enabled** (`httpBasic()`) — so the registration API and proxied actuator calls can authenticate with Basic credentials | 41 |
| CSRF | **enabled**, `CookieCsrfTokenRepository.withHttpOnlyFalse()`; ignoring `POST <ctx>/instances`, `DELETE <ctx>/instances/*`, `<ctx>/actuator/**` | 42-48 |
| Remember-me | `key(UUID.randomUUID().toString())`, `tokenValiditySeconds(60)` | 49 |
| Session management | **not configured** — default container HTTP session, no `maximumSessions`, no session-fixation override | — |
| CORS | **not configured** anywhere in this module (no `cors()`, no `WebMvcConfigurer`) | — |

**Can the admin UI reach registered services without re-authentication?** As configured, *this* module supplies **no credentials for downstream instances**. The only mechanism that would do so — `spring.boot.admin.client.instance.metadata.user.name` / `.password`, which is how an SBA client tells the server how to authenticate to its own secured endpoints — is **commented out** at `application.yml:30-35`. Nothing else in the module stores or injects instance credentials. Reaching the UI itself requires a form-login session or valid Basic credentials (line 41). No conclusion is drawn about any individual service's own protection — that is outside scope.

### E.3 How services are expected to register (what THIS module assumes)

- The module sets **zero active `spring.boot.admin.*` property**. Every such key present — `spring.boot.admin.client.url`, `.username`, `.password`, `.instance.metadata.user.name`, `.instance.metadata.user.password` — sits inside the commented block at **`application.yml:24-35`**, whose own comment reads *"configs to connect to self register the admin server as a client"*. **Admin-service therefore does not monitor itself.**
- The only registration facility on the classpath is **Consul discovery** (`spring-cloud-starter-consul-discovery`, `pom.xml:18-21`, plus `spring.cloud.consul.*` at `application.yml:11-16`). So this module's assumption is **discovery-based registration**: any service Consul knows about is a candidate for the UI. Registration is name-agnostic — **no sibling service name appears in any file in this module.**
- Properties this module actually reads: `server.port`, `spring.application.name`, `spring.cloud.consul.host`, `spring.cloud.consul.port`, `spring.cloud.consul.discovery.register-health-check`, `spring.security.user.name`, `spring.security.user.password`, `logging.*`, plus `spring.boot.admin.server.context-path` consumed implicitly through the injected `AdminServerProperties`.

### E.4 Actuator endpoints

- **This module exposes none.** `spring-boot-starter-actuator` is **absent** from the dependency list (`pom.xml:16-43`), and the only `management.*` key present — `management.endpoints.web.exposure.include: "*"` — is **commented out** (`application.yml:4-6`).
- Consequently the `/actuator/**` CSRF exemption at `WebSecurityConfig.java:48` is **inert in this module** — there is no actuator path to exempt.
- Which endpoints the SBA UI calls against *registered* services (`health`, `info`, `metrics`, `loggers`, `env`, thread/heap dump, etc.) is a `spring-boot-admin-starter-server` library default, **not configured here**, and cannot be enumerated from this module. Recorded in `gaps[]`.
- **No `management.*` setting is active for itself.** Net effect: the monitoring plane is itself unmonitored and unhealth-checkable (see also `register-health-check: false`).

### E.5 Logging (`application.yml:38-47`)

| Setting | Value |
|---|---|
| `logging.file.name` | `logs/admin-service.log` — **relative path**, plain text, no pattern/layout/JSON encoder |
| `logging.logback.rollingpolicy.max-file-size` | `10Mb` |
| `logging.logback.rollingpolicy.max-history` | `7` |
| `logging.level.org.hibernate.SQL` | `debug` |
| `logging.level.org.hibernate.type.descriptor.sql` | `trace` |

The two `org.hibernate` levels are **dead configuration**: this module has no JPA/Hibernate dependency at all (dependency list, `pom.xml:16-43`). They are copy-paste from a JPA service template. Harmless today, but if a persistence starter is ever added these two lines turn on full SQL + bound-parameter tracing into a plaintext log file.

## F. Risk surface (evidence only, no speculation)

1. **Plaintext credential committed.** `admin-service/src/main/resources/application.yml` **line 20** (`spring.security.user.name`) and **line 21** (`spring.security.user.password`) — both **plaintext literals**. Values deliberately not reproduced here. This is the *only* credential in the module, and it guards the control plane of the whole fleet.
2. **One shared account, no authorisation model.** No roles, no `authorities`, no OAuth2/OIDC/LDAP, no Spring Authorization Server integration — a single in-memory user authenticates the entire UI, with `httpBasic` also enabled (`WebSecurityConfig.java:41`).
3. **Not localhost-only by configuration.** No `server.address`, no `management.server.address`, no firewall/container/network definition exists in this module, so Tomcat binds **`0.0.0.0:5555`**. Nothing in the module restricts it to loopback. Conversely, **no CORS configuration exists**, so this module grants no cross-origin access.
4. **`rememberMe().key(UUID.randomUUID().toString())`, `tokenValiditySeconds(60)`** (`WebSecurityConfig.java:49`) — the key is regenerated on every restart (all tokens invalidated) and the TTL is 60 seconds, so remember-me is functionally meaningless while adding a token surface. Copy-paste artefact.
5. **CSRF disabled on the registration and deregistration API** — `POST /instances`, `DELETE /instances/*` (`WebSecurityConfig.java:43-47`). They remain behind `anyRequest().authenticated()`, but a CSRF-exempt endpoint that can register/remove monitored instances is the highest-value endpoint on this service.
6. **`CookieCsrfTokenRepository.withHttpOnlyFalse()`** (line 42) — the XSRF cookie is JavaScript-readable (required by the SBA UI, but it means any XSS on :5555 yields a usable CSRF token).
7. **`register-health-check: false`** (`application.yml:16`) — Consul never health-checks admin-service, so a hung or dead UI stays registered and discovery-based routing keeps pointing at it.
8. **Self-blindness:** no actuator dependency (§E.4) — the service that surfaces other services' health has no health endpoint of its own.
9. **Hardcoded `localhost:8500`, no Consul ACL token, no TLS property** (`application.yml:12-14`) — non-parameterised, unauthenticated Consul access.
10. **Unversioned-in-BOM second UI jar** (`spring-boot-admin-server-ui-login`, §E.1) — an unreferenced 1.x artifact sharing a classpath with the 2.7.x server UI.
11. **No tests, no CI:** no `spring-boot-starter-test` dependency and no `src/test` directory in this module.

## G. Cross-component evidence

| Target | Via | Nature |
|---|---|---|
| `.` (aggregator root `pom.xml`) | `admin-service/pom.xml:5-9` | Maven parent `pro.algotrade:algo-trade-platform:1.0`; supplies `java.version`, `${spring-cloud.version}`, `${spring-boot-admin.version}`, `${spring-boot-admin-ui.version}` and the Spring Boot parent BOM. Not followed — outside scope. |
| Consul agent `localhost:8500` | `admin-service/src/main/resources/application.yml:11-16` | Runtime, name-agnostic coupling. Any Consul-registered service may appear in the UI. |

**No sibling module is named, imported or referenced by URL anywhere in `admin-service`.** The only URL literal in the module (`http://localhost:5555`) points at *itself* and is commented out (`application.yml:27`). Whether siblings push to this UI via `spring.boot.admin.client.url` is decided in their own modules, which are out of scope.

## Patterns observed

1. **Component-based Spring Security** — `SecurityFilterChain` `@Bean`, `@EnableWebSecurity`, constructor-injected `AdminServerProperties` (`WebSecurityConfig.java:16-52`).
2. **Canonical SBA security recipe, verbatim** — the `assets/**` + `/login` permitAll pair, `redirectTo` success handler, and the `POST /instances` / `DELETE /instances/*` / `/actuator/**` CSRF-ignore triple are the upstream documentation snippet (`WebSecurityConfig.java:29-48`).
3. **Context path from `AdminServerProperties`, never hardcoded** — every matcher is `adminServer.getContextPath() + …`.
4. **Version inheritance from the aggregator** — placeholders only; the single explicit version is the UI-login artifact (`pom.xml:36,50,58`).
5. **Discovery-only coupling** — no Feign, RestTemplate or WebClient dependency; not even a Consul **config** client.
6. **Commented-out / dead configuration** — `application.yml:4-6`, `:24-35`, `:41-43`.
7. **Per-module Maven Wrapper** — Maven 3.8.6 / wrapper 3.1.0 committed inside `admin-service/`.

## Not determinable (see `gaps[]` in the JSON)

- The resolved values of `${spring-boot-admin.version}` / `${spring-boot-admin-ui.version}` (root `pom.xml`, out of scope) — the 2.7.7 / 1.5.7 figures come from the brief, not from a file read here.
- Which actuator endpoints each registered service actually exposes.
- Whether siblings register by pushing to `spring.boot.admin.client.url` or purely by Consul discovery.
- Runtime classpath behaviour of the extra 1.x login jar — verifying it needs a build, which this read-only analysis is not permitted to run.
- Whether `:5555` is reachable off-machine in practice (proxy/firewall/network) — no container, orchestration or pipeline file exists to say so.
- `mvnw` (POSIX shell) and `maven-wrapper.jar` (binary) were not opened.

## Recommendations (prioritised)

1. Externalise + rotate `spring.security.user.name` / `.password` (`application.yml:20-21`) — plaintext literals in a committed file.
2. Pin `server.address: 127.0.0.1` or move `:5555` onto a private network; nothing currently restricts the bind.
3. Remove `spring-boot-admin-server-ui-login` (`pom.xml:33-37`) after a build check — unreferenced.
4. Delete the `org.hibernate` log levels (`application.yml:41-43`) or scope them to a profile.
5. Add `spring-boot-starter-actuator` + an explicit `management.endpoints.web.exposure.include` allowlist, then re-enable self-registration (`application.yml:24-35`) — or document that the monitor is deliberately unmonitored.
6. Fix or drop `rememberMe` (`WebSecurityConfig.java:49`).
7. Set `register-health-check: true` once actuator exists.
8. Parameterise Consul (`${CONSUL_HOST:localhost}` / `${CONSUL_PORT:8500}`) and introduce a profile scheme — the module has exactly one environment today.
