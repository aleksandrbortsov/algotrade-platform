# auth-service — Component Analysis

- **Path:** `auth-service/` (Maven `artifactId` is `auth-server` — `pom.xml:11`)
- **Kind:** backend · **Coverage:** full · **Files read:** 19 · **Generated:** 2026-11-10
- **Stack:** Spring Boot 2.7.5 (inherited from `spring-boot-starter-parent`, root `pom.xml:7-12`) · Java 17 parent property, **overridden to source/target 10** in this module (`pom.xml:119-120`)

> **Headline finding.** This module is **not an OAuth2 authorization server in any working sense.** Every `@Configuration` class, every security bean, every token-signing method, the JPA dependency and the MySQL driver are commented out. What is live is one `@SpringBootApplication`, two `@RestController`s that return hardcoded strings, one `@Service` that always returns `null`, and Consul registration. Roughly **260 of ~425 main-source lines (≈61 %) are commented-out code.**

---

## 1. Entry points

| Type | File | Status |
|---|---|---|
| `@SpringBootApplication` | `src/main/java/pro/algotrade/authservice/AuthServiceApplication.java:6` | **live** — the only one; `main()` at line 9 |
| `@Configuration` | `SecurityConfig.java:30` | **commented out** — body lines 32-76 fully commented |
| `@EnableWebSecurity` + `@Configuration` | `config/DefaultSecurityConfig.java:15-16` | **commented out** — body lines 19-34 commented |
| `@Configuration(proxyBeanMethods=false)` | `config/AuthorizationServerConfig.java:41` | **commented out** — all 7 beans (lines 44-127) commented |
| `@Configuration` | `util/PasswordConfig.java:8` | **commented out** — bean lines 11-14 commented |

**Active `@Configuration` classes: 0.** The runtime bean set is produced solely by component scanning `pro.algotrade.authservice` plus Boot autoconfiguration (web MVC, Consul discovery, Boot Admin client).

Other live stereotypes: `@RestController` ×2 (`AuthController.java:15`, `InternalController.java:8`), `@Service` ×1 (`UserDtoService.java:14`). **`@Component` ×0** — `JwtUtils.java:19` has its `//@Component` commented.

Port: `server.port: 9000` (`application.yml:1-2`). Note: the module is one of only **three** with a fixed port — the rest of the platform uses `server.port: 0`.

## 2. Folder structure — every package under `src/main/java`

| Package | Files | Names |
|---|---|---|
| `pro.algotrade.authservice` | 2 | `AuthServiceApplication.java`, `SecurityConfig.java` |
| `pro.algotrade.authservice.config` | 2 | `AuthorizationServerConfig.java`, `DefaultSecurityConfig.java` |
| `pro.algotrade.authservice.controller` | 2 | `AuthController.java`, `InternalController.java` |
| `pro.algotrade.authservice.dto` | 1 | `UserDetailsDto.java` |
| `pro.algotrade.authservice.exception` | 2 | `JwtTokenMalformedException.java`, `JwtTokenMissingException.java` |
| `pro.algotrade.authservice.service` | 1 | `UserDtoService.java` |
| `pro.algotrade.authservice.util` | 4 | `JwtUtils.java`, `Jwks.java`, `KeyGeneratorUtils.java`, `PasswordConfig.java` |
| **Total main** | **14** | |
| `pro.algotrade.internalgateway` (test) | 1 | `HelloControllerTests.java` |

Module root also holds `pom.xml`, `auth-server.iml`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.{properties,jar}`. **A Maven wrapper IS committed here**, contradicting `development.md → "No Maven wrapper is committed"`.

No `package-info.java`, no `module-info.java`, no sub-packages beyond the seven above.

## 3. Architecture — how the authorization server is wired

**It is not wired.** The intended design is fully recoverable from the commented source, and it is the canonical Spring Authorization Server sample:

| Concern | Intended bean | Evidence | Runtime |
|---|---|---|---|
| `SecurityFilterChain` (authorization server) | `authorizationServerSecurityFilterChain(HttpSecurity)` with `@Order(HIGHEST_PRECEDENCE)`, `OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http)`, `.oidc(withDefaults())`, login redirect to `/login`, `oauth2ResourceServer(::jwt)` | `config/AuthorizationServerConfig.java:44-58` | absent |
| `SecurityFilterChain` (default) | `defaultSecurityFilterChain` — `formLogin` + `anyRequest().authenticated()` | `config/DefaultSecurityConfig.java:19-24` | absent |
| `SecurityFilterChain` (resource server) | `securityFilterChain` — `csrf().disable()`, `authorizeRequests().anyRequest().authenticated()`, `httpBasic`, `oauth2ResourceServer(::jwt)`, `STATELESS`, `BearerTokenAuthenticationEntryPoint` + `BearerTokenAccessDeniedHandler` | `SecurityConfig.java:38-53` | absent |
| `RegisteredClientRepository` | `JdbcRegisteredClientRepository` seeded with client `messaging-client`, `{noop}secret`, `CLIENT_SECRET_BASIC`, grants AUTH_CODE/REFRESH/CLIENT_CREDENTIALS, redirect `127.0.0.1:8080`, scopes `openid profile message.read message.write`, `requireAuthorizationConsent(true)` | `AuthorizationServerConfig.java:61-84` | absent |
| `OAuth2AuthorizationService` | `JdbcOAuth2AuthorizationService` | `:86-90` | absent |
| `OAuth2AuthorizationConsentService` | `JdbcOAuth2AuthorizationConsentService` | `:92-96` | absent |
| JWK source | `JWKSource<SecurityContext>` from `Jwks.generateRsa()` → `new JWKSet(rsaKey)` | `:98-103`, `util/Jwks.java:14-23` | absent |
| `JwtDecoder` | `OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource)` | `:105-108` | absent |
| `AuthorizationServerSettings` | `builder().build()` (default paths) | `:110-113` | absent |
| Schema | H2 `EmbeddedDatabase` running the three SAS `*-schema.sql` scripts | `:115-127` | absent |

Consequence: **no request path is authenticated.** With zero `SecurityFilterChain` and no Spring Security dependency at all, `POST /auth/login` is reachable unauthenticated and hands back the literal string `"token"`.

## 4. Dependencies — declared vs actually imported

### 4a. The brief's premise is wrong for 8 of the 14 listed artifacts

`auth-service/pom.xml` has **six commented-out dependency blocks**:

| Artifact named in the brief | pom lines | State | Imported by Java? |
|---|---|---|---|
| `spring-security-oauth2-authorization-server` 1.0.0 | 24-28 | **commented out** | only inside comments (`AuthorizationServerConfig.java:32-37`) |
| `spring-boot-starter-security` | 36-39 | **commented out** | **yes, live imports** at `util/PasswordConfig.java:5-6` → compile break |
| `spring-boot-starter-data-jpa` | 51-54 | **commented out** | no |
| `mysql-connector-j` | 56-60 | **commented out** | no |
| `jjwt-api` `${jsonwebtoken.version}` | 75-79 | **commented out** | no |
| `jjwt-impl` | 80-85 | **commented out** | no |
| `jjwt-jackson` 0.11.2 | 86-91 | **commented out** | no |

**Correction to `development.md`:** `jjwt-impl` is commented as `${jsonwebtoken.version}` (= **0.11.5**, root `pom.xml:39`), *not* "0.11.2 pinned independently". Only `jjwt-jackson` reads `0.11.2` (`pom.xml:88`). And auth-service is **not** a JPA+MySQL service.

### 4b. Actually active

| Artifact | Version | Imported by Java code? | Executable use? |
|---|---|---|---|
| `spring-boot-starter-web` | managed 2.7.5 | yes — both controllers, `RestTemplate`/`HttpHeaders` in `UserDtoService.java:5-12` | yes (MVC handlers) |
| `spring-cloud-starter-consul-discovery` | BOM 2021.0.5 | none (autoconfigured) | yes, at runtime |
| `spring-boot-admin-starter-client` | 2.7.7 | none | **no** — `spring.boot.admin.client.url` is unset |
| `jjwt` | 0.9.1 | yes — 7 live imports, `JwtUtils.java:9-15` | **no** — every calling method commented |
| `lombok` | 1.18.24 | yes — `@Data`, `@RequiredArgsConstructor`, `@Log4j2` | yes |
| `spring-boot-starter-test` | managed | n/a | **no tests execute** |
| `mapstruct-processor` | 1.5.3.Final | annotation-processor path only (`pom.xml:127-131`) | **no `@Mapper` in module, no `mapstruct` runtime dep** |

**Declared-but-unused: `spring-boot-admin-starter-client`, `jjwt` (imports present, no reachable code), `mapstruct-processor`.**

## 5. Code quality

- **Test class present:** `src/test/java/pro/algotrade/internalgateway/HelloControllerTests.java` (56 lines). It **asserts nothing.** Its package is `pro.algotrade.internalgateway` (line 1) — a leftover from a different module; the `@WebMvcTest({HelloController.class, TokenController.class})` at line 18 names three classes (`HelloController`, `TokenController`, `RestConfig`) that do not exist here. All three test methods — `rootWhenAuthenticatedThenSaysHelloUser` (`POST /token` with `httpBasic("user","password")` expects 200 then `GET /` returns `"Hello, user!"`), `rootWhenUnauthenticatedThen401`, `tokenWhenBadCredentialsThen401` — are commented (lines 25-55). **Runnable tests: 0. Assertions: 0.**
- **Lint/format config in the module: not found.** No Checkstyle/PMD/SpotBugs/editorconfig/spotless in `auth-service/`. Per `development.md`, those three tools are configured only in `.idea/`, so nothing is enforced on a clean checkout.
- **Maven plugins:** `spring-boot-maven-plugin` (repackage) and `maven-compiler-plugin` 3.8.1. **No Surefire/Failsafe/Jacoco customization → no coverage measurement.**
- **Code smells (concrete):** `System.out.println("Info saved...")` in production code (`AuthController.java:40`); `register()` performs no persistence despite the comment "Persist user to some persistent storage" (lines 39-42); `InternalController.getUserDetails()` returns `null` (line 16); `UserDtoService.getUserDto()` returns `null` (line 37) and logs a template string with no argument — `log.info("User from person-service: {}", )` has no placeholder at all (`line 35`); a raw `Authorization: "Service $serviceToken"` header placeholder is left in the source (`line 27`); an unused `var userDetailsDto` local (`AuthController.java:26`).
- **Exception base class is wrong:** both exception types extend `javax.naming.AuthenticationException` — the JDK **JNDI** class — instead of Spring Security's `AuthenticationException` (`JwtTokenMalformedException.java:3,5`, `JwtTokenMissingException.java:3,5`).
- **Overall:** a half-deleted tutorial scaffold, not a maintained service. Grade **D** — no tests, no lint, ~61 % dead commented code, one static compile error, two endpoints returning hardcoded values.

## 6. Code patterns

- **Token building (commented):** `Jwts.claims().setSubject(id)` → `Jwts.builder().setClaims(claims).setIssuedAt(now).setExpiration(now + tokenValidity).signWith(SignatureAlgorithm.HS512, jwtSecret).compact()` — **HMAC-SHA512 over a shared secret string**, `util/JwtUtils.java:39-46`.
- **Token verification (commented):** `Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token)` in `getClaims()` (`:30-37`) and `validateToken()` (`:48-62`), mapping `SignatureException`/`MalformedJwtException`/`ExpiredJwtException`/`UnsupportedJwtException` → `JwtTokenMalformedException`, and `IllegalArgumentException` → `JwtTokenMissingException`.
- **Key loading:** two *contradictory* intended mechanisms — (i) the symmetric `jwt.secret` property, (ii) `@Value("${jwt.public.key}") RSAPublicKey` + `@Value("${jwt.private.key}") RSAPrivateKey` feeding `NimbusJwtDecoder.withPublicKey(key)` / `NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(new RSAKey.Builder(key).privateKey(priv).build())))` (`SecurityConfig.java:32-36, 66-76`). Neither property is defined in `application.yml`. See §12(c).
- **Custom `UserDetails` / `AuthenticationProvider`:** **none.** What was intended is an in-memory `InMemoryUserDetailsManager` — `user1`/`password` roles `USER` (`DefaultSecurityConfig.java:26-34`) and `user`/`{noop}password` authority `app` (`SecurityConfig.java:55-64`). Both commented, both demo-grade.
- **DTO mapping:** **no MapStruct** — zero `@Mapper` classes, `mapstruct` not even a runtime dependency. The single DTO is Lombok `@Data` (`dto/UserDetailsDto.java:5-8`); mapping is nonexistent rather than manual.
- **Exception handling:** **no `@ControllerAdvice`, no `@ExceptionHandler`, no custom `ErrorController`.** The two exception classes are never thrown and never caught. Failures would surface as Boot's default `/error`.
- **DI:** Lombok `@RequiredArgsConstructor` constructor injection (`AuthController.java:17`, `UserDtoService.java:15`) — the one live field is `private final UserDtoService userDtoService` (`AuthController.java:20`).
- **Cross-service calls:** `RestTemplate` (see §12(e)). **No OpenFeign, no `WebClient`, no `RestClient` anywhere in the module.**

## 7. API specs

**Not found.** In `auth-service/` there is no OpenAPI/Swagger file (`*.yaml`/`*.json` spec, `springdoc`/`springfox` dependency), no Postman collection, no `.http`/Bruno file, no `README.md`, no `docs/`, and no Javadoc on any public type. The only machine-readable description of the surface is the source itself.

## 9. Top entities

**Zero JPA `@Entity` classes exist.** No `javax.persistence`/`jakarta.persistence` import appears anywhere in the module; `spring-boot-starter-data-jpa` is commented (`pom.xml:51-54`).

- **`UserDetailsDto`** — `dto/UserDetailsDto.java` — Lombok `@Data`, fields `String username`, `String password`. Not persisted; it is the `@RequestBody` type of `POST /auth/login` and the (always-`null`) return type of `UserDtoService.getUserDto`. **No table, no relations.**
- OAuth2 registered clients / authorizations / consents exist **only as commented JDBC wiring** on a throwaway H2 database (`AuthorizationServerConfig.java:61-127`); the intended tables are the SAS stock `oauth2_registered_client`, `oauth2_authorization`, `oauth2_authorization_consent` implied by the three `*-schema.sql` script paths at lines 122-124. Not created here.

## 10. Top endpoint groups

| Group | Methods | Count | Version | Auth | Source |
|---|---|---|---|---|---|
| `/auth/login` | POST | 1 | — | **none** (unauthenticated) | `controller/AuthController.java:23` |
| `/auth/auth/register` | POST | 1 | — | **none** | `controller/AuthController.java:37` |
| `/internal/userdetails` | GET | 1 | — | **none** | `controller/InternalController.java:12` |
| OAuth2/OIDC stock endpoints | — | **0** | — | — | `config/AuthorizationServerConfig.java:41` (commented) |

Notes:
1. **The register path is `/auth/auth/register`, not `/auth/register`** — class-level `@RequestMapping("/auth")` (line 16) composed with `@PostMapping("/auth/register")` (line 37). Almost certainly a bug.
2. `/oauth2/authorize`, `/oauth2/token`, `/oauth2/jwks`, `/oauth2/revoke`, `/oauth2/introspect`, `/connect/token`, `/connect/register`, `/oauth2/consent`, `/.well-known/openid-configuration` — **none registered**, because both the bean (`AuthorizationServerConfig.java:44-58`) and the dependency (`pom.xml:24-28`) are commented out.
3. Actuator endpoints arrive transitively via `spring-boot-admin-starter-client`; exposure is Boot default (`health`, `info`) because this module sets no `management.endpoints.web.exposure.include`. Not confirmed by a running build.
4. Total mapped application endpoints: **3**, all unauthenticated, all returning hardcoded or `null` payloads.

## 11. Named integrations

| Integration | Package | Where | Purpose |
|---|---|---|---|
| Consul discovery | `org.springframework.cloud:spring-cloud-starter-consul-discovery` | `pom.xml:46-49`; `application.yml:12-17` | registers `auth-service` at `localhost:8500`, `register-health-check: false` |
| JJWT | `io.jsonwebtoken:jjwt:0.9.1` (`io.jsonwebtoken.*`) | `pom.xml:31-34`; `util/JwtUtils.java:9-15` | intended HS512 sign/verify — inert |
| Spring Security crypto | `org.springframework.security.crypto.bcrypt` / `.password` | `util/PasswordConfig.java:5-6` (**live imports, no dependency**) | intended BCrypt — compile break |
| Nimbus JOSE | `com.nimbusds.jose.jwk.*` | `SecurityConfig.java:3-8`, `util/Jwks.java:3`, `AuthorizationServerConfig.java:5-8` (all commented) | intended RSA JWK / `/oauth2/jwks` |
| MySQL | `com.mysql:mysql-connector-j` | `pom.xml:56-60` (commented) | intended client store — absent |
| Spring Boot Admin | `de.codecentric:spring-boot-admin-starter-client:2.7.7` | `pom.xml:18-22` | intended monitoring — inert (no `client.url`) |
| Gateway (edge) | `org.springframework.web.client.RestTemplate` | `service/UserDtoService.java:10,18-19` | intended principal lookup via `http://localhost:3535` |
| Log4j2 API (via Lombok) | `lombok.extern.log4j2.Log4j2` | `service/UserDtoService.java:16` | logger generation on a Logback runtime |
| SMTP / mail | — | — | not found |

## 12. Persistence layer

**There is no persistence layer in this module.**

| Item | Value |
|---|---|
| JDBC driver | none — `mysql-connector-j` commented at `pom.xml:56-60` |
| JPA starter | none — commented at `pom.xml:51-54` |
| Dialect | not set — no `spring.jpa.*` / `spring.datasource.*` in `application.yml` |
| `ddl-auto` | **not set anywhere in this module** (`application.yml` has 23 lines: `server.port`, `spring.application.name`, `spring.jackson.default-property-inclusion`, `spring.cloud.consul.*`, `jwt.*`) |
| Migration tool | **none** — no Flyway, no Liquibase, no `db/migration` directory |
| Schema name | **none** (contrast: `persons_schema`, `users_schema` in sibling services) |
| Repository interfaces | **0** — no `*Repository`, no `extends JpaRepository`/`CrudRepository`, no `JdbcTemplate` bean |
| Intended (commented) store | H2 `EmbeddedDatabase`, `generateUniqueName(true)`, UTF-8, three SAS schema scripts — `AuthorizationServerConfig.java:115-127` |

**This directly contradicts `development.md → "spring-boot-starter-data-jpa + mysql-connector-j — persistence in person-service, user-service, account-service, auth-service"`.** For auth-service the claim is false; the Phase 3 detection read commented XML.

## 13. Priority research questions

### (a) Version compatibility — `spring-security-oauth2-authorization-server` 1.0.0 on Boot 2.7.5

**Verdict: currently harmless and untestable, because the dependency is commented out. If uncommented it becomes a real, source-visible incompatibility.**

Evidence:
1. `auth-service/pom.xml:24-28` — the whole `<dependency>` for `spring-security-oauth2-authorization-server:1.0.0` is inside `<!-- -->`. It is never resolved; there is nothing to be incompatible *with*.
2. The commented source targets the **1.0.x-era API generation with Spring-Security-5.7/javax imports** — an inconsistent mix:
   - 1.0.x-only-shaped API use: `OAuth2AuthorizationServerConfiguration` (`AuthorizationServerConfig.java:32`), `OAuth2AuthorizationServerConfigurer` (`:33`), `AuthorizationServerSettings` (`:34`), `JdbcRegisteredClientRepository` (`:29`), `JdbcOAuth2AuthorizationService` (`:26`), `JdbcOAuth2AuthorizationConsentService` (`:25`), `http.getConfigurer(OAuth2AuthorizationServerConfigurer.class).oidc(...)` (`:50-51`).
   - `@EnableAuthorizationServer` (the pre-0.4 annotation) is **absent** — consistent with 0.4+/1.0.x.
   - `JwtDecoder` is used (`:24`, `:106`) — **`OAuth2TokenDecoder` appears nowhere.** `JwtDecoder` is correct for both generations, so it does not discriminate.
   - **`RegisterClientServletFilter` appears nowhere.**
   - **Every live and commented `javax.*` import is `javax.*`, never `jakarta.*`:** `javax.naming.AuthenticationException` (`JwtTokenMalformedException.java:3`, `JwtTokenMissingException.java:3`). No `jakarta.*` string exists in the module. SAS 1.0.0 is built against Spring Security 6.1 / Boot 3.x, which require the `jakarta.*` namespace.
   - `SecurityConfig.java:14` imports `org.springframework.security.config.annotation.web.configurers.oauth2.server.resource.OAuth2ResourceServerConfigurer` — that is the Spring Security **5.x** package layout.
3. The commented H2 schema-script paths (`AuthorizationServerConfig.java:122-124`) use `org/springframework/security/oauth2/server/authorization/...` which exists in both 0.4.x and 1.0.x, so it does not discriminate.

**So: the source is written against Spring Security 5.7 idioms (Boot 2.7 correct) while pinning an authorization-server artifact from the Boot-3 line.** That combination is the incompatibility. What I cannot decide from source alone: whether 1.0.0 fails at *resolution*, at *compile*, or only at *runtime* — because its transitive Spring Security version could in principle be overridden by Boot's dependency management, and no build was run.

**Evidence that would settle it:** `mvn -pl auth-service dependency:tree -Dincludes=*oauth2-authorization-server*,*spring-security*` with `pom.xml:24-28` uncommented (does it drag Spring Security 6.1 while Boot pins 5.7?), plus the `spring-security-oauth2-authorization-server:1.0.0` POM's own `spring-security-oauth2-client` version, plus a single `mvn -pl auth-service test-compile`. The deciding fact is not in this repository.

### (b) Four JWT stacks — who signs, who verifies

**Nothing signs and nothing verifies. Today no token is produced or consumed anywhere in this module.**

- **On the classpath:** only `io.jsonwebtoken:jjwt:0.9.1` (`pom.xml:31-34`). `jjwt-api`/`jjwt-impl`/`jjwt-jackson` are commented (`pom.xml:75-91`); `java-jwt` (auth0) is **not** a dependency of this module at all (it belongs to `gateway-service`); Nimbus is not resolvable here. So the "four stacks" figure is a **reactor-wide** total, not a per-module one — this module carries **one** real JWT artifact plus three commented ones.
- **`jjwt` 0.9.1 is really used in code — but only in dead code.** Its imports are live and uncommented (`JwtUtils.java:9-15`: `Claims`, `ExpiredJwtException`, `Jwts`, `MalformedJwtException`, `SignatureAlgorithm`, `SignatureException`, `UnsupportedJwtException`), which compiles against 0.9.1's pre-modular API (`Jwts.parser()`, `setSigningKey`, `SignatureAlgorithm.HS512`). Every one of the three methods using them is commented (`JwtUtils.java:30-62`), and the only caller — `jwtUtil.generateToken(...)` in `AuthController.java:32` — is commented too.
- **Intended signer:** `JwtUtils.generateToken` with `SignatureAlgorithm.HS512` + `jwt.secret` (`:45`). **Intended verifier:** the same class, `getClaims`/`validateToken` (`:32`, `:50`) — i.e. jjwt was to do both, symmetrically.
- **Competing intended signer:** `NimbusJwtEncoder` over an RSA JWK (`SecurityConfig.java:71-76`) and the SAS `jwkSource()` (`AuthorizationServerConfig.java:98-103`), with `NimbusJwtDecoder`/`OAuth2AuthorizationServerConfiguration.jwtDecoder` as verifier (`SecurityConfig.java:66-69`, `AuthorizationServerConfig.java:105-108`).
- **Answer to "which library actually signs":** none, here; `AuthController.java:34` returns the literal string `"token"`. Whoever verifies must therefore be out of scope (`gateway-service`), which is the only place a verifier could be live.

### (c) Key material — `src/main/resources/app.key`

**The file is orphaned. No class loads it, and no property names it.**

- File facts (contents deliberately not read, per the secret-handling rule): `src/main/resources/app.key`, **1734 bytes**, last modified 2022-11-24; `src/main/resources/app.pub`, **458 bytes**. The sizes are consistent with a 2048-bit RSA keypair in PEM text, but the PEM header/algorithm was not read, so **the algorithm is unconfirmed**.
- A search of every `.java` and `.yml` in the module finds **zero** occurrences of `app.key`, `app.pub`, `jwt.public.key` or `jwt.private.key` in any *live* position. The only references are the commented `@Value("${jwt.public.key}")` / `@Value("${jwt.private.key}")` fields at `SecurityConfig.java:32-36`, and **`application.yml` defines neither property** (its 23 lines contain only `server.port`, `spring.application.name`, `spring.jackson.*`, `spring.cloud.consul.*`, `jwt.secret`, `jwt.token.validity`).
- Therefore it signs **nothing**. Even if `SecurityConfig` were uncommented, Boot would fail to resolve `${jwt.public.key}` / `${jwt.private.key}` — the keys are on the classpath but never bound. Key generation in the commented design is *runtime* (`KeyGeneratorUtils.java:10-20`, `KeyPairGenerator.getInstance("RSA").initialize(2048)`), which would ignore these files entirely; they are the leftovers of the earlier `@Value`-based experiment.
- **Handling note:** both files are committed to git. They postdate the `jwt.secret` property, and since neither is referenced, deleting `app.key`/`app.pub` is safe **only** after confirming no sibling module loads them by the same classpath name — `gateway-service` was not inspected (out of scope).

### (d) `jwt.secret` / `jwt.token.validity` — two parallel token mechanisms?

- **Reader:** `util/JwtUtils.java` — `@Value("${jwt.secret}") private final String jwtSecret` (commented, **line 23-24**) and `@Value("${jwt.token.validity}") private final long tokenValidity` (commented, **line 26-27**). Used at `:42` (`nowMillis + tokenValidity`) and `:45` (`signWith(HS512, jwtSecret)`) — both commented. **No live class reads either property.** `JwtUtils` also lost its `@Component` (line 19 commented), so it is not even a bean.
- **Properties themselves:** `application.yml:20-23`. `jwt.secret` is `${APP_JWT_SECRET:<hardcoded 40-char fallback>}` — **value not reproduced here**; the file's own comment on line 19 says *"secret key - should be encrypted"*. `jwt.token.validity: 180000` (3 minutes, per the comment on line 22) is a plain number, not a secret.
- **Two mechanisms in parallel?** **Yes, scaffolded — but never simultaneously active, and neither is active.** Mechanism A is jjwt HS512 keyed by `jwt.secret`; Mechanism B is Spring Authorization Server with an RSA `JWKSource` issuing via `/oauth2/token` (`AuthorizationServerConfig.java:98-108`). They produce incompatible tokens (HS512 subject-only claims vs RS256 with SAS-managed claims) and share no key material. Because A's only caller is commented (`AuthController.java:32`) and B's whole configuration is commented, the module today has **zero** token mechanisms. Re-enabling both is the main design hazard here, not a present defect.
- **Cross-module consequence:** `jwt.secret` with a committed fallback is a *symmetric* secret any consumer of the repo could use to mint accepted tokens — the gateway (out of scope) is the presumed verifier. Treat the property as a live credential.

### (e) Does auth-service call another service, and how?

**Intended yes; actually no call is made.**

- **Mechanism: `RestTemplate`.** Import at `service/UserDtoService.java:10` (`org.springframework.web.client.RestTemplate`) — **live**. `HttpHeaders`/`HttpEntity`/`HttpMethod`/`ParameterizedTypeReference` imported at lines 5-12, also live.
- **Target:** `API_GATEWAY_URL = "http://localhost:3535"` + `API_USERSDETAILS_URL = "/internal/userdetails"` (`UserDtoService.java:18-19`) → **gateway-service** (port 3535), not user-service directly. The log text at `line 35` ("User from person-service") indicates the principal ultimately comes from **person-service** behind the gateway. **`user-service` is never named in this module.**
- **Why no call happens:** the field `private final RestTemplate restTemplate` is commented (`line 21`), the entire `restTemplate.exchange(...)` call is commented (`lines 29-32`), there is **no `RestTemplate` bean** in the module (every configuration class is inert, and no `RestTemplateBuilder`/`RestClient`/`WebClient` appears), and the method unconditionally `return null` (`line 37`). `AuthController.login` then ignores the result — `var userDetailsDto = userDtoService.getUserDto(...)` (`line 26`) is unused because the password check that consumed it is commented (`lines 28-30`).
- **Confirmed: no `spring-cloud-starter-openfeign` in `auth-service/pom.xml`** (and, per the brief, in none of the poms). No `@EnableFeignClients`, no `@FeignClient`, no `WebClient`, no `RestClient`, no `HttpClient`. **RestTemplate is the platform's inter-service client mechanism** — this module is the only place in scope that evidences it.
- **Two defects to fix when the call is restored:** (1) the URL is a hardcoded `localhost:3535` even though the module registers with Consul — it should be a load-balanced `http://gateway-service/...` on a `@LoadBalanced` `RestTemplate`; (2) the concatenated path would produce `/internal/userdetails<username>` with **no separator** (`line 30`), and the method takes `username` yet sends `GET` with a header placeholder `"Service $serviceToken"` (`line 27`) that is never substituted.

## 14. Cross-component dependencies (targets recorded, not followed)

| Target | Via |
|---|---|
| `gateway-service` | `RestTemplate` GET `http://localhost:3535/internal/userdetails` — `service/UserDtoService.java:18-19,26-32`; commented, so no live traffic |
| `person-service` | ultimate source of the principal; only evidence is the log string at `service/UserDtoService.java:35` |
| `config-service` | **no dependency** — no config-client dependency in this pom, and no `auth*.yml` exists under `config-service/src/main/resources` (filename search). This module is configured solely by its own `application.yml` |
| `admin-service` | `spring-boot-admin-starter-client` (`pom.xml:18-22`) with no `spring.boot.admin.client.url` → unconfigured |

## 15. Recommendations (priority order)

1. **Report auth-service as unimplemented** in all downstream configuration. It authenticates nobody; `POST /auth/login` returns the string `"token"`.
2. **Fix the compile break first:** restore `spring-boot-starter-security` (`pom.xml:36-39`) or delete the live imports at `util/PasswordConfig.java:5-6`. Everything else is blocked behind it. (Static conclusion — no build was run; see gaps.)
3. **Pick one token mechanism** (jjwt/HS512 **or** Spring Authorization Server/RSA) and delete the other scaffold, before any feature work.
4. **Do not re-enable SAS 1.0.0 on Boot 2.7.5** without the dependency-tree check in §13(a).
5. **Rotate and externalise** the `jwt.secret` fallback (`application.yml:21`) and decide the fate of the committed `app.key`/`app.pub`.
6. **Reconcile the build:** compiler `source/target 10` (`pom.xml:119-120`) vs root `<java.version>17</java.version>`; drop the unused `mapstruct-processor` path; rename `artifactId auth-server` → `auth-service`.
7. **Delete ~260 lines of commented code**, add a real `@RestControllerAdvice`, replace `System.out.println` (`AuthController.java:40`), and give the module at least one executing test (it currently has 0).
8. **Add CI** — none exists for this module or the repository, which is why the compile break could survive.
9. **Correct `development.md`**: auth-service has no JPA/MySQL, a Maven wrapper *is* committed here, and `jjwt-impl` is commented at `${jsonwebtoken.version}` = 0.11.5, not 0.11.2.

## 16. What could not be determined

See `gaps[]` in the JSON artifact — 6 items, the material ones being: no build was executed (bash is read-only here), so the `PasswordConfig` compile failure and the actuator surface are static-analysis conclusions; the PEM algorithm of `app.key` was not read by design; and whether SAS 1.0.0 truly fails on Boot 2.7.5 needs a dependency tree this repository cannot supply.
