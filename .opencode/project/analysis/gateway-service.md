# gateway-service — component analysis

- **Component:** `gateway-service` · **kind:** `backend` (reactive Spring Cloud Gateway edge service)
- **Generated:** 2026-11-10 · **schemaVersion:** 1 · **files read:** 12 · **coverage:** `full` (in-scope), route table by **hand-off** — see §12
- **Module size:** 11 tracked files, **4 Java classes**, 1 YAML, **0 tests**, 89 lines of Java

> **The headline is negative and it matters.** The brief's question 4 lists `spring-boot-starter-security`, `java-jwt 4.2.1` and `jjwt 0.9.1` as this module's dependencies. **All three are commented out** in `pom.xml` (lines 61-64, 49-53, 55-59). No JWT library is on the classpath and no Java file imports one. `gateway-service` is not a token *validator* — it is a token **relay** that asks another service whether the token is good. Phase 3 recorded the opposite (`.opencode/rules/development.md:42`, `.opencode/project_init.md:220`); both need correcting.

---

## 1. Entry points

| Path | What it is |
|---|---|
| `src/main/java/pro/algotrade/gatewayservice/GatewayServiceApplication.java` | The **only** `@SpringBootApplication`. 13 lines; `main()` → `SpringApplication.run`. No `@Enable*`, no `RouteLocator` bean, no `CommandLineRunner`. |
| `src/main/resources/bootstrap.yml` | **The only resource file** (3 lines). `spring.application.name: gateway-service`, `spring.config.import: optional:configserver:${CONFIG_SERVER:http://localhost:8888/}`. There is **no `application.yml`** in this module. |
| `src/main/java/pro/algotrade/gatewayservice/config/WebClientConfig.java` | The only `@Configuration`. One `@Bean`: `@LoadBalanced WebClient.Builder`. |
| `src/main/java/pro/algotrade/gatewayservice/config/AuthFilter.java` | `@Component extends AbstractGatewayFilterFactory<AuthFilter.Config>`. Runtime entry for any route that names it (`AuthFilter`). |

`spring-cloud-starter-bootstrap` is on the classpath **and** `bootstrap.yml` exists, so the legacy bootstrap context runs; `spring.config.import` is the modern Boot-2.4 mechanism. **Both are configured — redundant, and only the `config.import` is load-bearing.**

## 2. Folder structure (`src/main/java`)

| Package | Files | Contents |
|---|---|---|
| `pro.algotrade.gatewayservice` | 1 | `GatewayServiceApplication` |
| `pro.algotrade.gatewayservice.config` | 2 | `AuthFilter` (+ nested `Config`), `WebClientConfig` |
| `pro.algotrade.gatewayservice.dto` | 1 | `UserDto` |
| `src/main/resources` | 1 | `bootstrap.yml` |
| `src/test` | **0 — directory does not exist** | — |

Three packages, four classes. `git ls-files gateway-service` is exhaustive: the rest is `pom.xml`, `gateway-service.iml`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/{maven-wrapper.properties,maven-wrapper.jar}`. **No `Dockerfile`** (only `person-service` and `user-service` have one).

## 3. Architecture pattern

**Reactive filter-chain** (Spring Cloud Gateway / WebFlux route + filter pipeline). *Not* layered, *not* controller-service-repository.

Evidence: `pom.xml:28-31` pulls `spring-cloud-starter-gateway` (Netty/WebFlux) and **never** `spring-boot-starter-web`; `AuthFilter.java:22` returns a `(exchange, chain) -> Mono` lambda and continues with `chain::filter` through `flatMap` (`:44`); the outbound hop is reactive `WebClient` (`:35-38`); `WebClientConfig.java:10-14` makes it `@LoadBalanced`; **zero** `@RestController`/`@RequestMapping` in the module; there is no service or repository layer to be layered.

## 4. Dependencies (`gateway-service/pom.xml`)

Versions come from the root aggregator (`pom.xml:30-40`) and the `spring-cloud-dependencies` BOM imported at `pom.xml:85-95`.

| Artifact | Version | Role **here** |
|---|---|---|
| `spring-cloud-starter-gateway` | BOM 2021.0.5 | Reactive edge router. The reason the app is WebFlux-based. |
| `spring-cloud-starter-consul-discovery` | BOM | Registers `gateway-service`; supplies the `DiscoveryClient` that resolves the `service-users` host. |
| `spring-cloud-starter-consul-config` | BOM | Consul KV config source. **Not** dead: per §12, `spring.cloud.consul.config.enabled: true` is set for gateway and **no other consumer enables it**. |
| `spring-cloud-starter-config` | BOM | Config-client driven by `bootstrap.yml:3`. Delivers the whole runtime config. |
| `spring-cloud-starter-bootstrap` | BOM | Re-enables the bootstrap context so `bootstrap.yml` is read. |
| `org.apache.commons:commons-lang3` | **unresolved statically** | **UNUSED.** No `org.apache.commons` / `StringUtils` / `ObjectUtils` import exists in the module. |
| `de.codecentric:spring-boot-admin-starter-client` | `2.7.7` (`${spring-boot-admin.version}`) | Registers with the admin-service monitoring UI. |
| `org.projectlombok:lombok` | `1.18.24`, provided + annotation processor | One use: `@Data` on `UserDto`. |
| `spring-boot-starter-test` | 2.7.5, test scope | Declared; **zero test sources.** |
| ~~`com.auth0:java-jwt`~~ | ~~4.2.1~~ | **Commented out**, `pom.xml:49-53`. Not a dependency. |
| ~~`io.jsonwebtoken:jjwt`~~ | ~~0.9.1~~ | **Commented out**, `pom.xml:55-59`. Not a dependency. |
| ~~`spring-boot-starter-security`~~ | — | **Commented out**, `pom.xml:61-64`. Not a dependency. |

**Build-plugin conflict:** `maven-compiler-plugin` 3.8.1 is pinned with `<source>10</source><target>10</target>` (`pom.xml:101-116`) while the parent declares `java.version` **17** (`pom.xml:31`). This module is asked to compile to a different bytecode level from the rest of the reactor.

## 5. Code quality

- **Tests: not found.** `gateway-service/src/test` does not exist. 0 test classes against 4 production classes — including the platform's only authentication gate.
- **TODO / FIXME / XXX / HACK / `@Deprecated`: 0.**
- **Logging: none.** No `@Slf4j`, no `Logger`, no `log.*` call. A rejected request leaves no trace from this code.
- **Lint / format: none in the build.** No Checkstyle/PMD/Spotless/editorconfig. `gateway-service.iml` carries only a SonarLint `uniqueId` (lines 3-5) — IDE-side attachment, nothing enforced by Maven, so a clean checkout enforces nothing.
- **CI:** not found (none in the repository at all).
- **History:** 2 commits touch the module (`initial commit`, `bbf3563 SSH key added`).

## 6. Code patterns

| Pattern | Evidence |
|---|---|
| Reactive stack exclusively, no servlet API | `pom.xml:28-31`; `AuthFilter.java:22`; `bodyToMono` at `:38` |
| Self-registering filter factory | `@Component` + `AbstractGatewayFilterFactory<Config>` (`AuthFilter.java:10-11`), `super(Config.class)` (`:16`) |
| Service-id URI + `@LoadBalanced` WebClient — **no OpenFeign** | `WebClientConfig.java:10-14`; `AuthFilter.java:37`; `spring-cloud-starter-openfeign` is absent from the pom |
| **Reject by throwing an untyped `RuntimeException`** | `AuthFilter.java:24` `"Missing authorization information"`, `:32` `"Incorrect authorization structure"`. **No** `ErrorWebExceptionHandler`, `@ExceptionHandler`, `@ControllerAdvice`, or `SecurityWebFilter` anywhere in the module |
| **Discarded reactive mutation (dead path)** | `AuthFilter.java:40-42`: `exchange.getRequest().mutate();` — return value dropped, and the `.header("X-auth-user-id", …)` line beneath it is commented out. `UserDto` is deserialised and **never read**. The authenticated identity is never forwarded downstream |
| Commented-out dependency blocks kept in-tree | `pom.xml:49-53`, `55-59`, `61-64` |
| Per-module duplication of the BOM import | `pom.xml:85-95`; same block in `admin-service/pom.xml:47-53` |
| **No CORS configuration at all** | grep `cors\|CorsWebFilter\|CorsConfiguration` → no matches |
| Maven Wrapper committed per module | `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` (wrapper 3.1.0, Maven 3.8.6) — contradicts `.opencode/rules/development.md`, which states no wrapper is committed |

**JWT validation flow (the real one).** `AuthFilter.apply` → header present? (`:23`) → split on space, require exactly 2 parts and `"Bearer"` (`:29-31`) → `WebClient` **POST** to `http://service-users/users/validateToken?token=<token>` (`:35-37`) → `bodyToMono(UserDto.class)` (`:38`) → mutate (no-op) → `chain::filter` (`:44`). A 2xx from that call *is* the authorisation decision. There is no signature check, no expiry check, and no claim inspection in this process.

## 7. API-spec discovery

**not found.** No OpenAPI, no Swagger, no springdoc artifact (none among the 9 active + 3 commented `<dependency>` declarations), no Postman/Bruno collection, no README, no `.http` file inside `gateway-service`. This gateway publishes no machine-readable description of itself; its entire contract is the route table (§9).

## 8. Top entities

Only two types exist, and neither is a domain entity:

- **`UserDto`** — `dto/UserDto.java`, `@Data`, fields `long id`, `String login`, `String token`. It is the shape the gateway *expects back* from `/users/validateToken`. **Bound but never read** — its only intended consumer is the commented-out `X-auth-user-id` header.
- **`AuthFilter.Config`** — nested static class (`AuthFilter.java:48-50`), deliberately empty (`"empty class as I don't need any particular configuration"`), so the filter takes **no route arguments**.
- **JWT claim holder / token model: not found.** The token is an opaque string throughout (`:29-37`). No config-properties class (`@ConfigurationProperties`) exists either.

## 9. Top endpoint groups — the core question

### (a) Where are routes declared? **Neither. Not in this component at all.**

The only YAML is the 3-line `bootstrap.yml`, containing no `spring.cloud.gateway.routes`. There is no `RouteLocator` bean and no `@Configuration` that builds routes. A grep over `src/` for `routes`, `predicates`, `StripPrefix`, `lb://`, `RouteLocator`, `management`, `actuator`, `health`, `security`, `cors` returns **nothing** but package declarations. Routes are pulled at bootstrap time from **`config-service/src/main/resources/config/gateway-service.yml:36-54`** — a path this brief declared opaque, so it was **not read here**. The table below is a **hand-off** from the peer artifact `config-service.json`, whose own brief *does* cover that file. Attributed, not independently verified.

| # | PathPattern | Target (service-id) | Predicates | Filters | Auth | Provenance |
|---|---|---|---|---|---|---|
| 1 | `/auth/**` | `lb://auth-service` (id `auth-service-id`) | 1 (`Path`) | none | **NONE** — deliberate: login/token entry | hand-off |
| 2 | `/users/**` | `lb://user-service` (id `user-service-id`) | 1 (`Path`) | `AuthFilter` | **required** | hand-off |
| 3 | `/persons/**` | `lb://person-service` (id `person-service-in` — typo) | 1 (`Path`) | `AuthFilter` | **required** | hand-off |
| 4 | `/{service-id}/**` (implicit) | *every* Consul-registered service | 0 | none | **NONE** | hand-off |

- **No `StripPrefix`, `AddRequestHeader`, `Retry` or `RequestRateLimiter` is recorded on any route.** Only `AuthFilter`.
- Row 4 is the security consequence of `spring.cloud.gateway.discovery.locator.enabled: true` (`gateway-service.yml:37`): the 3-route table is a **convenience list, not an allow-list**. `account-service`, `notification-service`, `config-service` and `admin-service` are reachable straight through the edge by service-id, no filter applied — and so is anything that registers later.
- `server.port: 3535` (fixed — unlike the three services on `server.port: 0`).
- **Actuator / health paths exposed by this module: not found.** No `management.*` key exists in scope; whatever is exposed is decided by the out-of-scope document.
- **Outbound contract actually owned by this module:** `POST http://service-users/users/validateToken?token=<jwt>` — `AuthFilter.java:37`.

## 10. Named integrations

| Name | Package / endpoint | Used in | Purpose |
|---|---|---|---|
| **user-service token validation** | `http://service-users/users/validateToken` (raw `WebClient`, no Feign) | `AuthFilter.java:35-38` | The **only** authentication mechanism in this gateway |
| **Consul** | `spring-cloud-starter-consul-{discovery,config}`, default `localhost:8500` | `pom.xml:39-47` | Registration + resolution of `service-users`; KV config enabled for this service only |
| **Spring Boot Admin client** | `de.codecentric:spring-boot-admin-starter-client:2.7.7` | `pom.xml:71-75` | Monitoring-plane registration; URL `${ADMIN_SERVER:http://localhost:5555/}` supplied externally (hand-off) |
| **config-service** | `optional:configserver:${CONFIG_SERVER:http://localhost:8888/}` | `bootstrap.yml:3` | Delivers the entire runtime config incl. the route table |
| `io.jsonwebtoken:jjwt` **0.9.1** | — | **nowhere** | **NOT integrated** — commented out *and* unreferenced |
| `com.auth0:java-jwt` **4.2.1** | — | **nowhere** | **NOT integrated** — commented out *and* unreferenced |
| `spring-boot-starter-security` | — | **nowhere** | **NOT integrated** — commented out |

**No external internet URL** appears anywhere in this module. The two URL literals are both `localhost` defaults and both env-overridable.

## 11. Persistence layer

**none — stateless.** No JPA, no `mysql-connector-j`, no `spring-jdbc`, no R2DBC, no cache dependency in `pom.xml`; grep for `ddl-auto|datasource|jdbc|jpa` returns no matches. The gateway owns no schema and holds no state. It is the only backend module in the platform of which this is cleanly true.

## 12. The five specific questions

**(a) Where are routes declared, YAML or Java?**
**Neither, inside this component.** Both formats are absent from `gateway-service`. They are declared as YAML **in a different module** — `config-service/src/main/resources/config/gateway-service.yml:36-54` — and reach the gateway through `bootstrap.yml:3`. See §9 for the table and its provenance.

**(b) Which JWT library actually verifies tokens, and where?**
**None.** Nothing is on the classpath and nothing is imported. Verification is *delegated over HTTP* to the `service-users` service at `AuthFilter.java:35-38`. This process never parses the token, so it cannot see `exp`, `signature` or claims.

**(c) Is `jjwt` 0.9.1 referenced by any Java file here, or only declared in the pom?**
**Neither.** It is not even declared — the declaration sits inside an XML comment (`pom.xml:55-59`), so it never reaches the classpath — and grep for `io.jsonwebtoken|Jwts|JWT|SignatureAlgorithm` over `src/` returns zero matches. Identical situation for `com.auth0:java-jwt` 4.2.1 (`pom.xml:49-53`).

**(d) What happens to an expired/invalid token — which class produces the 401?**
**No class produces a 401; the client gets a 500.** A missing header (`:24`) or a malformed Bearer value (`:32`) throws a bare `RuntimeException` inside the filter chain. With no `ErrorWebExceptionHandler`, `@ControllerAdvice` or `SecurityWebFilter` in the module, WebFlux's default error handling renders that as **HTTP 500** with a Boot default JSON body. A downstream 401 from `/users/validateToken` surfaces as `WebClientResponseException` from `.retrieve()` and likewise becomes **500**. And this is **not** dead code — the hand-off shows `AuthFilter` is attached to `/users/**` and `/persons/**`, so every unauthenticated call to those two prefixes answers 500. *Derived from the code plus reactive-stack defaults; not observed at runtime.*

**(e) Is any service base-URL hardcoded instead of resolved via Consul / `lb://`?**
One literal: `"http://service-users/users/validateToken"` (`AuthFilter.java:37`) — hard-coded scheme **and** service-id, not `lb://`, not injected from config. Because the builder is `@LoadBalanced`, the host component *is* still resolved through Consul Discovery, so it is not a fixed host:port. **But it exposes a real inconsistency:** the route table resolves `lb://user-service` while this filter hand-builds `http://service-users`. Two different service-ids for one service. Second literal: `http://localhost:8888/` (`bootstrap.yml:3`), overridable via `CONFIG_SERVER`.

## 13. Secret handling

No secret, key, password, token or private-key value appears in `gateway-service`: the module contains no credential property of any kind (its only YAML has 3 lines) and `AuthFilter` handles a bearer token only as a runtime value, never a literal. Nothing was redacted because nothing exists to redact.

One **transport** concern is in scope and is a defect, not a secret leak in the repo: the bearer token is placed in a **query string** (`AuthFilter.java:37`), which puts live credentials into access logs, proxy logs and any mesh log on the path. Move it to the downstream `Authorization` header.

For context (path-cited only, values deliberately not reproduced, and outside this scope anyway): `config-service/src/main/resources/config/gateway-service.yml:22` supplies `${ADMIN_SERVER:http://localhost:5555/}` — a URL with no credential, per the config-service analysis, which separately records plaintext credentials in *other* delivered documents and a commented RSA private key in `config-service/src/main/resources/application.yml`.

## 14. Gaps (what could not be determined)

1. **Route table not independently verified.** Every route fact is a hand-off from `config-service.json`. If that report is wrong, §9 is wrong with it. Line numbers also disagree by ±1 between the two peer reports that cite the file (`:39-42/:45-47/:50-53` vs `:40-42/:45-47/:51-53`).
2. **Unquoted properties of `gateway-service.yml` remain unknown:** any `default-filters` block, global CORS / `management` / security keys, any `Retry`/`RequestRateLimiter`, and this service's actuator exposure list.
3. **`service-users` resolution — the top open question.** Needs `user-service`'s `spring.application.name`, which neither brief's scope covers. The `lb://user-service` target makes a mismatch *likely*; "likely" is not "confirmed", and no live request was observed.
4. **No build was run**, so the 500-vs-401 conclusion is inference from defaults, BOM-resolved versions are unconfirmed, and whether the module compiles under `source/target 10` against a Java 17 reactor is untested.
5. `mvnw` / `mvnw.cmd` not opened (standard Wrapper 3.1.0 scripts); `maven-wrapper.jar` binary.

## 15. Recommendations

**P1 — defects**
1. **`AuthFilter.java:40-42`**: the `mutate()` result is thrown away and the `X-auth-user-id` line is commented out, so the authenticated identity never reaches any downstream service. Rebuild as `exchange.getRequest().mutate().header("X-auth-user-id", String.valueOf(userDto.getId())).build()` and pass the *mutated* exchange into the chain.
2. **Return 401, not 500**: replace both `throw new RuntimeException(...)` (`:24`, `:32`) with a typed exception plus an `ErrorWebExceptionHandler` that answers 401 for missing/malformed tokens and maps the downstream `WebClientResponseException.Unauthorized` to 401 too.
3. **Bearer token out of the query string** (`:37`); send it as the downstream `Authorization` header. Add explicit `onStatus` handling instead of relying on `.retrieve()`, plus a timeout, so an unavailable `user-service` degrades cleanly instead of hanging the edge.
4. **Reconcile `service-users` vs `user-service`** before any release — see §12(e). If they differ, there is no working authenticated path in the platform.
5. **`discovery.locator.enabled: true` is an open door** (needs confirming in `gateway-service.yml`): any Consul service becomes reachable through the edge with no filter. Disable it or constrain it.

**P2 — hygiene**
6. Delete the three commented dependency blocks (`pom.xml:49-53`, `55-59`, `61-64`); they are exactly what misled Phase 3. Correct `.opencode/rules/development.md:42` and `.opencode/project_init.md:220`, which currently attribute `jjwt`/`java-jwt`/security to this module.
7. Drop `<source>10</source><target>10</target>` (`pom.xml:106-107`) in favour of the parent's Java 17.
8. Drop `commons-lang3` (`pom.xml:66-69`) — zero imports.
9. **Add the first test.** 4 classes, the sole auth gate, 0 tests. One `WebTestClient` test proving 401-without-token and 200-with-valid-token pins precisely what fixes 1-2 change.
10. **Bring routes in-tree** — a local `application.yml` or a `RouteLocator` bean here, leaving config-service for environment overrides. Today this component cannot be reviewed or tested as a gateway.

**Process** — the route enumeration the brief demanded exists in this report **only as an attributed hand-off**; the authoritative copy is in `config-service.json`. No re-dispatch is needed for routes, but Phase 5 should cross-link the two artifacts, because a reader of `gateway-service.json` alone finds no inbound route declared in this component.

---

*Cross-component dependencies recorded (target path only, none followed): `config-service/src/main/resources/config/gateway-service.yml` (config import), `user-service` service-id `service-users` (HTTP POST), `auth-service` (`/auth/**`), `person-service` (`/persons/**`), `admin-service` (`:5555`), implicit routes to `account-service` / `notification-service` / `config-service`, Consul agent `localhost:8500`, and the root aggregator `pro.algotrade:algo-trade-platform:1.0`.*
