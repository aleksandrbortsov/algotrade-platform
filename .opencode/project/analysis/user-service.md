# Component analysis — `user-service`

- **Path:** `user-service/` · **kind:** backend · **Coverage:** `full` · **Files read:** 42 (all 34 Java files in the module + `pom.xml`, `Dockerfile`, `bootstrap.yml`, 3 `.properties`, `.gitignore`)
- **Stack:** Spring Boot 2.7.5 · Java 17 parent, **compiled to Java 10 bytecode in this module** (`pom.xml:139-140`) · MySQL `users_schema` · Spring Cloud 2021.0.5
- **Shape:** 34 Java classes, 938 lines of main source, 1 `@RestController`, 3 `@Entity`, **0 tests**

All paths below are relative to `user-service/` unless another module is named. Sibling modules were not opened; every cross-boundary reference is recorded in `crossComponentDependencies` (JSON) with target path/service-id only.

---

## 1. Entry points

| File | What it is |
|---|---|
| `src/main/java/pro/algotrade/userservice/UserServiceApplication.java` | **The only `@SpringBootApplication`** (line 10); `main()` 13-15. Imports `@Bean`, `BCryptPasswordEncoder`, `PasswordEncoder` (5-7) yet declares **no bean** — dead imports; the encoder actually comes from `PasswordConfig`. |
| `src/main/java/pro/algotrade/userservice/SecurityConfig.java` | `@Configuration` (10) · single `SecurityFilterChain` bean (15-23) — see §EXTRA(c). |
| `src/main/java/pro/algotrade/userservice/PasswordConfig.java` | `@Configuration` (9) · `PasswordEncoder` = `new BCryptPasswordEncoder()` (11-14). The only live security bean. |
| `src/main/java/pro/algotrade/userservice/UserApplicationConfiguration.java` | `@Configuration` (8) · `ResourceBundleMessageSource` (11-17, basenames `message/exception`, `message/notification`, `useCodeAsDefaultMessage(true)`) · **`RestTemplate` bean = bare `new RestTemplate()`**, no `@LoadBalanced`, no interceptor, no timeout (19-22). |
| `src/main/resources/bootstrap.yml` | 3 lines only: `spring.application.name=user-service`, `spring.config.import=optional:configserver:${CONFIG_SERVER:http://localhost:8888/}`. **There is no `application.yml` in this module** — every runtime property (datasource, JPA, Consul, `server.port`, `jwt.secret`, `jwt.token.validity`) is delivered by `config-service`. |
| `pom.xml`, `mvnw`, `mvnw.cmd`, `.gitignore`, `user-service.iml` | build/IDE side-car. `mvnw`/`mvnw.cmd` are committed **but `.mvn/wrapper/` is absent**, so the wrapper cannot download Maven — it is not a usable wrapper (this also corrects the global "no Maven wrapper is committed" note for this module). |

Two further component-scanned beans are entry points into behaviour rather than into configuration: `security/JwtUtil.java:17` (`@Component`), `security/JwtTokenFilter.java:21` (`@Component`, `OncePerRequestFilter`) and `utility/QrCodeGenerator.java:17` (`@Component`).

**Infra note (one paragraph).** `user-service/Dockerfile` is 4 lines: `FROM openjdk:17` → `EXPOSE 8080` → `ADD target/user-service-1.0.jar user-service-1.0.jar` → `ENTRYPOINT ["java","-jar","/user-service-1.0.jar"]`. It is a plain single-stage build with no builder stage, no `JAVA_OPTS`/`JDK_JAVA_OPTIONS` hook, no `HEALTHCHECK`, no non-root `USER`, and no environment defaults. Two mismatches matter: (i) `EXPOSE 8080` is fiction — the service runs with `server.port: 0` (random, Consul-assigned, per `.opencode/rules/development.md:45`), so nothing ever listens on 8080; (ii) the container gets no `CONFIG_SERVER` and no Consul host, while the application hard-requires `config-service` at `localhost:8888` (`bootstrap.yml:3`), Consul at `localhost:8500` and MySQL at `localhost:3307` — all `localhost`, i.e. **unrunnable as a container without extra env**, and there is no `docker-compose` in the repository to supply it. Build prerequisite: `spring-boot-maven-plugin` must have produced `target/user-service-1.0.jar` first; the image build itself runs no tests (there are none).

---

## 2. Folder structure (every package, file counts)

```
user-service/
├── pom.xml  Dockerfile  mvnw  mvnw.cmd  .gitignore  user-service.iml
└── src/main/
    ├── java/pro/algotrade/userservice/                      4   app + @Configuration
    │   ├── UserServiceApplication.java                      @SpringBootApplication
    │   ├── SecurityConfig.java                              SecurityFilterChain
    │   ├── PasswordConfig.java                              BCryptPasswordEncoder
    │   ├── UserApplicationConfiguration.java                MessageSource + RestTemplate
    │   ├── controller/                                      1   UserController
    │   ├── controller/dto/                                  3   UserRequest, UserResponse, PersonDto
    │   ├── service/                                         2   UserService, NotificationService (interfaces)
    │   ├── service/impl/                                    2   UserServiceImpl, MailServiceImpl
    │   ├── persistence/                                     3   UserEntity, RoleEntity, PermissionEntity
    │   ├── persistence/repository/                          1   UserRepository
    │   ├── persistence/utility/                             2   Status, Role (enums)
    │   ├── mapper/                                          1   UserMapper (@Mapper)
    │   ├── mapper/utility/                                  3   UserStatusResolver, @EntityStatus, @DtoStatus
    │   ├── security/                                        2   JwtUtil, JwtTokenFilter
    │   ├── exception/                                       6   5 service exceptions + JwtTokenMissing/Malformed
    │   ├── exception/config/                                3   GlobalErrorCode, ErrorResponse, UserGlobalExceptionHandler
    │   └── utility/                                         1   QrCodeGenerator
    └── resources/
        ├── bootstrap.yml                                    1
        └── message/                                         4   exception(.properties|_rus), notification(.properties|_rus)
```

`src/test/` **does not exist**. Layering convention actually used: **`controller` → `service` (interface) → `service.impl` → `persistence.repository` → `persistence` (@Entity)**, plus four satellite packages that are *not* layers but cross-cutting or supporting packages: `controller.dto` (wire types), `mapper` + `mapper.utility` (conversion), `exception` + `exception.config` (error model), `security` (transport auth), `utility` (QR helper), `persistence.utility` (enums). Naming is `persistence` where most Spring projects say `entity`/`model`, and `persistence.utility` where the enums are really domain constants.

---

## 3. Architecture

**Pattern: classic 4-tier layered monolith-per-service**, no domain/aggregate layer, no application-service façade.

- Controller depends on the **interface** (`UserController.java:27 UserService service`), implementation is `service/impl/UserServiceImpl.java:28`, which implements `UserService` **and** Spring Security's `UserDetailsService` in the same class — persistence concerns, business rules and Spring Security principal loading are one bean.
- The controller also reaches **past** the service layer to the mapper (`UserMapper.INSTANCE`) and to the network (`restTemplate`, `UserController.java:28`). So the layering is *documented* as 4-tier but *enforced* nowhere: orchestration lives in the controller.
- **MapStruct is dominant, and it is the only mapper.** One `@Mapper` interface, `mapper/UserMapper.java:13-25`, two methods, 4 `@Mapping` declarations, custom qualifiers `@EntityStatus`/`@DtoStatus` (`mapper/utility/EntityStatus.java:9-12`, `DtoStatus.java:9-12`) resolving `String ↔ Status` through `mapper/utility/UserStatusResolver.java:8,25`. Manual mapping survives only for what the entity cannot see: `createdDto.setPerson(person)` at `UserController.java:41,64,87`, because `PersonDto` is fetched over HTTP.
- **Structural smell worth naming:** `UserMapper.INSTANCE = Mappers.getMapper(UserMapper.class)` (`UserMapper.java:16`) makes the mapper a **static singleton, not a Spring bean** — every call site (`:37,40,61,74,84`) is a static call, so mapping cannot be injected, mocked or decorated while everything else in the module is constructor-injected.
- Zero `@Transactional`, zero `@Valid`, zero pagination, zero `@Query`, one repository for three entities → the "domain" is a thin CRUD shell.

---

## 4. Dependencies (`pom.xml`) — declared vs actually imported

| Artifact | Version / scope | Imported in Java? | Evidence |
|---|---|---|---|
| `spring-boot-starter-web` | 2.7.5 managed | **yes** | `@RestController`/`@RequestMapping`/`ResponseEntity` (`UserController.java:6,20-24`), `RestTemplate`, `HttpClientErrorException` (`:9-10`) |
| `spring-boot-starter-data-jpa` | managed | **yes** | `javax.persistence.*` (`UserEntity.java:8`), `JpaRepository` (`UserRepository.java:3`) |
| `spring-boot-starter-security` | managed | **yes** | `SecurityFilterChain`, `HttpSecurity`, `SessionCreationPolicy` (`SecurityConfig`), `BCryptPasswordEncoder` (`PasswordConfig.java:5-13`), `UserDetails` (`UserEntity.java:5,15`), `GrantedAuthority` (`RoleEntity.java:4,15`), `OncePerRequestFilter` + `UsernamePasswordAuthenticationToken` (`JwtTokenFilter.java:4-8,21,47`), `AuthenticationException` (both JWT exceptions) |
| `io.jsonwebtoken:jjwt` | **0.9.1** (`pom.xml:40`) | **yes, one file only** | `security/JwtUtil.java:3` `import io.jsonwebtoken.*`; `Jwts.parser()`/`Jwts.builder()`/`SignatureAlgorithm.HS512` (26,39-40) |
| `spring-cloud-starter-bootstrap` | BOM 2021.0.5 (`pom.xml:43-46`) | n/a (enabler) | without it `bootstrap.yml` is ignored — this dependency is what makes external config load |
| `spring-cloud-starter-config` | BOM (`pom.xml:48-51`) | **indirectly** | only via `bootstrap.yml:3 config.import=optional:configserver:…`; no Java import |
| `spring-cloud-starter-consul-discovery` | BOM (`pom.xml:83-86`) | **no import** | runtime auto-registration only; no `@EnableDiscoveryClient` needed |
| `com.mysql:mysql-connector-j` | managed, `runtime` (`pom.xml:71-75`) | **no import by design** | JDBC only |
| `org.mapstruct:mapstruct` | `${org.mapstruct.version}` = 1.5.3.Final | **yes** | `@Mapper`/`@Mapping`/`Mappers` (`UserMapper.java:3-5,13,16`), `@Qualifier` (`EntityStatus.java:3,9`) |
| `org.projectlombok:lombok` | `${org.projectlombok.version}` = 1.18.24, `provided` | **yes, everywhere** | `@Data` (3 entities + 3 DTOs), `@RequiredArgsConstructor` (6 classes), `@Slf4j`, `@Getter`, `@Builder`, `@Log4j2` |
| `org.apache.commons:commons-lang3` | managed, **`provided`** (`pom.xml:88-92`) | **NO — 0 imports** | grep `org.apache.commons|StringUtils|ObjectUtils` over `src/`: **0 hits**. Dead dependency, and `provided` would exclude it from the runtime classpath anyway |
| `org.jboss.aerogear:aerogear-otp-java` | **1.0.0** (`pom.xml:94-98`) | **1 import only** | `UserEntity.java:4` `import org.jboss.aerogear.security.otp.api.Base32` → used at `:26`. `Totp` appears **only in a comment** (`UserController.java:52`) |
| `com.google.zxing:core` + `:javase` | **3.5.1** via `<zxing.version>` (`pom.xml:12,100-110`) | **yes, one file** | `utility/QrCodeGenerator.java:3-8` (`BarcodeFormat`, `WriterException`, `MatrixToImageConfig`, `MatrixToImageWriter`, `BitMatrix`, `QRCodeWriter`) |
| `de.codecentric:spring-boot-admin-starter-client` | `${spring-boot-admin.version}` = 2.7.7 (`pom.xml:53-57`) | no import | autoconfig only |
| `spring-boot-starter-test` | managed, `test` (`pom.xml:77-81`) | n/a | **`src/test/` does not exist** |
| **absent:** `spring-boot-starter-validation` | — | — | bean validation is impossible as written; no `@Valid` anywhere |
| **absent:** `spring-boot-starter-mail` | — | — | no SMTP in this component (see §11) |
| **absent:** `spring-cloud-starter-openfeign` | — | — | confirmed absent here and repo-wide → `RestTemplate` is the *only* client type (§EXTRA(e)) |

Build plugins: `spring-boot-maven-plugin` (repackage) and `maven-compiler-plugin` **3.8.1 with `<source>10</source><target>10</target>`** (134-154) plus Lombok + MapStruct annotation-processor paths (141-152). The `source/target 10` override is inconsistent with `java.version 17` in the aggregator and with `openjdk:17` in the `Dockerfile`.

---

## 5. Code quality

- **Tests: not found.** No `src/test` directory, no test class, no test resource; `spring-boot-starter-test` declared and unused. (Repo-wide only 2 test classes exist, none here.)
- **Lint/format: not found in this module** — no Checkstyle/PMD/SpotBugs/EditorConfig/Surefire/Failsafe/Jacoco configuration. The IDE project (`.idea/checkstyle-idea.xml`, `.idea/PMDPlugin.xml`, `.idea/sonarlint/`) configures all three, so **nothing is enforced on a clean checkout or in CI** (and there is no CI at all).
- **TODO/FIXME: 2 occurrences** — `SecurityConfig.java:18` `//todo authenticate` (sitting on the line that disables CSRF) and `UserController.java:50-51` (the QR/2FA plan, whose code is commented out at 52-59).
- **Largest class: `controller/UserController.java` — 123 lines.** Then `service/impl/UserServiceImpl.java` 85, `persistence/UserEntity.java` 49, `utility/QrCodeGenerator.java` 47, `mapper/utility/UserStatusResolver.java` 40, `exception/config/UserGlobalExceptionHandler.java` 40. Total 34 files / 938 lines.
- **Named defects found (each verified by reading the file):**
  1. `UserController.java:47` `@GetMapping("/{id}")` (`Long id`) and `:70` `@GetMapping("/{username}")` (`String username`) are **the same URL shape**. The numeric route shadows the username route; `GET /users/jdoe` reaches `getById` and fails `Long` conversion. `getByUsername` is effectively unreachable. *(static inference — the app was not started)*
  2. `UserController.java:117-122` `POST /users/login` is dead: `byte[] bytes = toString().getBytes()` calls `toString()` **on the controller instance**, the array is discarded and the method **returns `null`** — Spring answers 200 with an empty body.
  3. `UserServiceImpl.java:62-68` `update(Long id, UserRequest userRequest)` **never reads `userRequest`**: `getById(id)` → `save(unchanged)` → return. `PUT /users/{id}` cannot change anything.
  4. `UserServiceImpl.java:38-48` order of work in `create`: UUID → QR render → **BCrypt hash** → duplicate-username check. A rejected duplicate pays a QR render and a BCrypt round first.
  5. `security/JwtUtil.java:18-22` `@Value` on **`private final`** fields of a `@RequiredArgsConstructor` class. Lombok does not copy `@Value` onto constructor parameters (no `lombok.config` exists in the module), so the two properties may bind to `null`; and neither has a default, so a missing `config-service` document fails the context — see §1 gaps.
  6. `persistence/UserEntity.java:39-40` `@Column(columnDefinition="TINYINT") private Status status` **with no `@Enumerated`** → Hibernate persists the **ordinal**, while the stable `Status.code` (`persistence/utility/Status.java:10,18`) is never used. Reordering the enum silently rewrites the meaning of every stored row. `RoleEntity` gets this right (`@Enumerated(STRING)`, `RoleEntity.java:21`), which proves the omission is accidental.
  7. `@Data` on both sides of the bidirectional `@ManyToMany` (`UserEntity.authorities` ↔ `RoleEntity.user`, and `RoleEntity.permissions` ↔ `PermissionEntity.roles`) → Lombok generates `equals`/`hashCode`/`toString` that recurse through the association. `log.info("User get {}", dto)` is safe today only because DTOs are logged, not entities — any future entity in a log statement is a `StackOverflowError`.
  8. `RoleEntity.java:36-39 getAuthority()` returns `permissions.toString()` — a `PermissionEntity@hash`-style string, so **no `hasAuthority`/`hasRole` expression can ever match**.
  9. `exception/config/UserGlobalExceptionHandler.java:34-39` catches `{Exception.class}`, answers **400 with a raw `String`** (not `ErrorResponse`) and blames the wrong service: `"Exception occurred inside Person Service"`. It also swallows the `RuntimeException` the JWT filter throws (`JwtTokenFilter.java:42`).
  10. `UserController.java:105-112`: a person-service 404 already raised `HttpClientErrorException`, so it is mapped to `INTERNAL_ERROR`(1000); the `person == null` branch (→ `PersonEntityNotFoundRuntimeException`, 1001) is nearly unreachable, and neither yields 404.
  11. `utility/QrCodeGenerator.java:19` hard-coded absolute path `C:\Projects\\Trainings\\AlgoTradePlatform\\...` — a directory from a **different, older checkout**, outside this repository. `asImage()` is never called, so it is latent, but the moment it is called the app writes outside the workspace.
  12. `MailServiceImpl.java` implements `NotificationService`, whose only method is commented (`NotificationService.java:4`) → a `@Service` with **zero methods**; its call site is commented too (`UserServiceImpl.java:50`).
  13. `UserApplicationConfiguration.java:14` registers basename `message/notification`, but `notification.properties` **and** `notification_rus.properties` are **empty files**; `exception_rus.properties` is missing the 4th key (`error.qr_code.generation`) → with `useCodeAsDefaultMessage(true)` a Russian locale hits that path and receives the literal key as its message.
  14. `@Log4j2` (`JwtUtil.java:5,16`) against Boot's default Logback — the sibling artifacts show the same mix; harmless via the `log4j-to-slf4j` bridge, but inconsistent with `@Slf4j` used in the other 4 classes.

---

## 6. Code patterns

| Concern | What the code actually does | Evidence |
|---|---|---|
| **DTO ↔ entity** | MapStruct, static singleton `UserMapper.INSTANCE`; `login` ⇄ `username` rename; `String` ⇄ `Status` via custom qualifiers | `UserMapper.java:16,18-20,23-25`; call sites `UserController.java:37,40,61,74,84` |
| **Validation** | **None.** No `@Valid`, no constraint annotation, no `spring-boot-starter-validation`. The only guard is the duplicate-username lookup | `UserServiceImpl.java:45-48` |
| **Exception model** | `RuntimeException` subclass carrying **i18n message key + numeric code**; 4 subclasses hard-code the pair; codes centralised in a final utility class | `UserServiceGlobalRuntimeException.java:7-12`, `UserEntityNotFoundRuntimeException.java:8`, `UserAlreadyRegisteredException.java:8`, `PersonEntityNotFoundRuntimeException.java:8`, `GlobalErrorCode.java:7-10` |
| **Error response shape** | `ErrorResponse { Long code; String message; }`, `@Builder`, **always HTTP 400**; catch-all returns a bare `String` instead | `ErrorResponse.java:8-10`; `UserGlobalExceptionHandler.java:25-31,34-39` |
| **i18n** | Manual `ResourceBundleMessageSource`, 2 basenames, `useCodeAsDefaultMessage(true)`, en + ru bundles | `UserApplicationConfiguration.java:11-17`; `resources/message/*.properties` |
| **Pagination** | **Not used at all** — no `Pageable`/`Page`/`Sort`/`@Query`; there is no collection endpoint | `UserRepository.java:10-11` |
| **Transactions** | **No `@Transactional` anywhere (0/34 files)** — every repository call is its own transaction; `create` = read + write in two transactions | `UserServiceImpl.java:45-52` |
| **Password encoding** | `BCryptPasswordEncoder` (default strength 10), **encode-only on create**; no `matches()`, no change/reset path | `PasswordConfig.java:11-14`; `UserServiceImpl.java:43` |
| **`commons-lang3`** | **0 usages** — declared `provided`, never imported (contrast: `notification-service` really does use `DateUtils.MILLIS_PER_DAY` here). Deletable | grep over `user-service/src`: 0 hits; `pom.xml:88-92` |
| **Remote call** | private controller helper wrapping `RestTemplate.getForObject`, catch `HttpClientErrorException`, then a `null` check | `UserController.java:101-115` |
| **Entity = principal** | `UserEntity implements UserDetails`, `RoleEntity implements GrantedAuthority`, `UserServiceImpl implements UserDetailsService` | `UserEntity.java:15`, `RoleEntity.java:15`, `UserServiceImpl.java:28,81-84` |
| **Status enum quirk** | `UserStatusResolver.resolveToEntity` defaults **any unknown string to `USER_ACCOUNT_ENABLE`** while the entity's own default is `USER_ACCOUNT_ACTIVE` — two different "active-ish" defaults | `UserStatusResolver.java:19-21` vs `UserEntity.java:40` |

---

## 7. API specs

**not found.** No `springdoc-openapi`, no `swagger-*`, no `spring-boot-starter-hateoas`, no `openapi.yaml`/`swagger.json`, no Postman/Bruno collection, no `README.md`, no `doc/` directory anywhere under `user-service/`. Resources in the module are exactly `bootstrap.yml` + 4 `.properties`. The only REST contract is the code itself plus the gateway route table owned by `config-service/src/main/resources/config/gateway-service.yml` (out of scope, not opened).

---

## 8/9. Business modules and top entities

### Business modules

| Module | Path | State |
|---|---|---|
| **User account CRUD** (login, password hash, `personId` link, status) | `src/main/java/pro/algotrade/userservice/controller/UserController.java` + `service/impl/UserServiceImpl.java` + `persistence/repository/UserRepository.java` | live but partly broken (§5 items 1-3) |
| **Role & permission RBAC** | `persistence/RoleEntity.java`, `persistence/PermissionEntity.java`, `persistence/utility/Role.java` | **schema only — inert**: no repository, no seeding, no mapping from `UserRequest.role`, unusable authority string |
| **TOTP secret + QR provisioning** | `utility/QrCodeGenerator.java`, `persistence/UserEntity.java:26,29,48` | **half-implemented**: secret + QR exist, verification and exposure do not |
| **Bearer-JWT handling** | `security/JwtUtil.java`, `security/JwtTokenFilter.java` | validation live-ish, issuing dead, filter unregistered in the chain |
| **Localised error reporting (en/ru)** | `exception/`, `exception/config/`, `src/main/resources/message/` | live |
| **User-creation notification** | `service/NotificationService.java`, `service/impl/MailServiceImpl.java` | **empty shell** (was Kafka, now nothing) |

### Entities (all 3 `@Entity` classes in the module)

**`UserEntity` — table `T_USERS`** · `persistence/UserEntity.java` (49 lines)

| Field | Note |
|---|---|
| `id` | `@Id @GeneratedValue(IDENTITY)` |
| `uuid` | random UUID, assigned in `UserServiceImpl.java:35` |
| `username`, `password` | password BCrypt-hashed on create only |
| **`secret`** | `private String secret = Base32.random();` (line **26**) — the **TOTP shared secret**, generated per entity instance, stored in **plaintext**, never encrypted, never rotated |
| `qrCode` | `@Column(columnDefinition="BLOB") byte[]` (28-29) — the PNG of the TOTP provisioning URI |
| `personId` | **`Long` — FK by id to person-service's Person**, plain column, **not** a JPA association (31) |
| `authorities` | `@ManyToMany(EAGER)` → `RoleEntity` via `@JoinTable T_USERS_ROLES(user_id, role_id)` (33-37) |
| `status` | `Status` enum in a `TINYINT`, ordinal-encoded (39-40) |
| `accountNonExpired/accountNonLocked/credentialsNonExpired/enabled` | 4 hardcoded `true` `UserDetails` flags (42-45) |
| **`mfa`** | `private boolean mfa = false;` (line **48**) — the MFA opt-in flag; **never read, never written** anywhere |

Relations: `T_USERS ⟷ T_ROLES` (M:N, `T_USERS_ROLES`), `T_USERS → person-service Person` (by id, over HTTP).

**`RoleEntity` — table `T_ROLES`** · `persistence/RoleEntity.java` (40 lines): `id`; `roleType` : `Role{OWNER,TRADER,VIEWER}` `@Enumerated(STRING)` in column `NAME unique not null`; `isDefaultRole` (never read); `user` = inverse `@ManyToMany(mappedBy="authorities")` (27-28); `permissions` = M:N `PermissionEntity` via `T_ROLES_PERMISSIONS(role_id, permission_id)` (30-34); `getAuthority()` returns `permissions.toString()` (36-39).

**`PermissionEntity` — table `T_PERMISSIONS`** · `persistence/PermissionEntity.java` (27 lines): `id`, `name`, `description`, `value : Long`, inverse `roles` (25-26). No permission value is ever compared to anything.

Join tables `T_USERS_ROLES` and `T_ROLES_PERMISSIONS` are declared only through `@JoinTable` — there is no entity for either, and **no `account-service`/`account` FK anywhere** in this module despite the platform owning an `account-service`.

---

## 10. Top endpoint groups

Single controller: `controller/UserController.java`, class-level `@RequestMapping("/users")` (line 21). **6 handler methods, 2 path groups, 0 versioned, 0 authenticated.**

| Method + path | Handler | Auth | Behaviour note |
|---|---|---|---|
| `POST /users` | `create(UserRequest)` :30-45 | **permitAll** | HTTP `personId` lookup → map → `service.create` → 200 (not 201) |
| `GET /users/{id}` | `getById(Long)` :47-68 | **permitAll** | + HTTP person lookup; contains the **commented-out TOTP verify** (52-59) |
| `GET /users/{username}` | `getByUsername(String)` :70-78 | **permitAll** | **shadowed** by `/{id}` — §5 item 1 |
| `PUT /users/{id}` | `update(Long, UserRequest)` :80-91 | **permitAll** | no-op update — §5 item 3 |
| `DELETE /users/{id}` | `delete(Long)` :93-99 | **permitAll** | returns `200 "User was deleted"`, not 204 |
| `POST /users/login` | `login(UserRequest)` :117-122 | **permitAll** | returns `null` — §5 item 2 |

Actuator endpoints are **not declared here**; they arrive transitively via `spring-boot-admin-starter-client`, and their exposure is set in `config-service` (recorded as `management.endpoints.web.exposure.include: "*"` platform-wide) — not verifiable inside this scope.

---

## 11. Named integrations

MySQL (`com.mysql:mysql-connector-j`, `users_schema` :3307) · HashiCorp **Consul** discovery (`localhost:8500`) · **Spring Cloud Config** (`optional:configserver:${CONFIG_SERVER:http://localhost:8888/}`) · **Spring Boot Admin client** 2.7.7 → `admin-service` · **JJWT 0.9.1** HS512 bearer issue/verify · **`aerogear-otp-java` 1.0.0** (`Base32.random()` only) · **ZXing 3.5.1** `core`+`javase` (QR PNG into a BLOB) · **`RestTemplate` → `http://localhost:3535/persons/{id}`** (gateway → `person-service`).

**SMTP: not found.** `spring-boot-starter-mail` is not a dependency here; the only `Mail*` artefact is the empty `MailServiceImpl` whose body was a `KafkaTemplate.send("mails", …)` — commented (`MailServiceImpl.java:4,11-16`), and Kafka is not a dependency either. E-mail belongs to `notification-service`. No RabbitMQ, Kafka, Redis, S3 or third-party SDK appears anywhere in the module.

---

## EXTRA — Persistence layer

| Item | Value | Where |
|---|---|---|
| Starter | `spring-boot-starter-data-jpa` | `pom.xml:22-25` |
| Driver artifact | `com.mysql:mysql-connector-j`, `scope runtime` | `pom.xml:71-75` |
| Driver class | `com.mysql.cj.jdbc.Driver`, via `spring.datasource.driver-class-name` | delivered in `config-service/src/main/resources/config/user-service.yml:55` (**path + property name only, value not copied**) |
| Dialect | **never set** in this module — no `spring.jpa.database-platform`, no `hibernate.dialect`; Hibernate 5.6 auto-detects from JDBC metadata | absence across `user-service/**` |
| `hibernate.ddl-auto` | `update` (Hibernate owns the schema; **no Flyway/Liquibase/changelog/SQL file**) | delivered by config-service; recorded `.opencode/rules/development.md:44` |
| Schema | `users_schema` on `localhost:3307` (non-default MySQL port; nothing in-repo starts it) | `.opencode/rules/development.md:45`, `.opencode/rules/project/metadata.json:17` |
| Service port | `server.port: 0` → random, Consul-assigned | same |
| Tables | `T_USERS`, `T_ROLES`, `T_PERMISSIONS` + join tables `T_USERS_ROLES`, `T_ROLES_PERMISSIONS` | `persistence/*.java` |
| **Spring Data repositories (complete list)** | **1:** `pro.algotrade.userservice.persistence.repository.UserRepository extends JpaRepository<UserEntity, Long>` with derived query `Optional<UserEntity> findByUsername(String)` | `persistence/repository/UserRepository.java:10-11` |
| Entities **without** a repository | `RoleEntity`, `PermissionEntity` — unreachable from application code | — |

⚠️ **Secret handling:** this component reads `jwt.secret` and `jwt.token.validity` (`JwtUtil.java:18,22`) and needs `spring.datasource.username`/`.password`, all delivered from `config-service/src/main/resources/config/user-service.yml` (`spring.datasource.*` ≈ lines 52-55). Those lines are recorded in `.opencode/project_init.md:228,248` as a **P0 committed-credential gap**. Cited by path, line and property name only — no value is reproduced in either artifact.

---

## EXTRA — Explicit answers

**(a) TOTP second factor — not implemented; only the secret exists.**
- Only live use of `aerogear-otp-java`: `persistence/UserEntity.java:4` imports `org.jboss.aerogear.security.otp.api.Base32` and **line 26** initialises `private String secret = Base32.random();`.
- **No class generates or verifies an OTP anywhere in the module.** The `Totp` API appears exactly once, **inside a comment block**: `controller/UserController.java:52` `// Totp totp = new Totp(entity.getSecret());` and `:54` `// if (!totp.verify("verificationCode"))` (block 50-59, sitting in `getById`).
- **Shared secret storage:** `UserEntity.secret` (String) → column `secret` of table **`T_USERS`** (no `@Column` overrides, no encryption, no `@Convert`). Flag column: `UserEntity.mfa` (line 48) — never read, never written.
- **Endpoints in an enrol/verify flow: none.** Enrolment is implicit and invisible: `POST /users` → `UserServiceImpl.create` (`:35-38`) assigns the UUID, renders the QR from `entity.getSecret()` and stores both. There is no `/otp`, `/mfa`, `/totp`, `/enrol` or `/verify` route, no request field accepts a code (`UserRequest` has only `login`, `password`, `personId`, `status`, `role`), and no response field returns one.

**(b) QR provisioning — rendered, stored, never returned.**
- Renderer: **`utility/QrCodeGenerator.java`** (`@Component`, line 17). `asByteArray(text,300,300)` (29-39) → `QRCodeWriter.encode(text, QR_CODE, w, h)` (41-45) → `MatrixToImageWriter.writeToStream(…, "PNG", out, new MatrixToImageConfig(0xFF000002, 0xFFFFC041))`.
- **It returns a raw `byte[]` PNG — not base64.** The base64 conversion is commented out at line **36** (`// String qrcode = Base64.getEncoder().encodeToString(qrCode);`).
- Called once: `service/impl/UserServiceImpl.java:38 entity.setQrCode(qrCodeGenerator.asByteArray(entity.getSecret(), 300, 300))`, failure → `UserServiceGlobalRuntimeException("error.qr_code.generation", 1003)` (`:40`).
- **No endpoint returns the QR.** `controller/dto/UserResponse.java` has only `id, uuid, login, person, status` — no `qrCode` field — so the PNG written into `T_USERS.qr_code` is unreachable through the API. `asImage()` (21-27) writes to the stale absolute Windows path at line 19 and has **zero callers**.

**(c) permitAll vs authenticated — `SecurityConfig`.**
- Config class: **`src/main/java/pro/algotrade/userservice/SecurityConfig.java`**, bean `securityFilterChain(HttpSecurity)` (lines 15-23).
- **`anyRequest().permitAll()` — line 19.** There is therefore **no authenticated path**: not a single protected path exists; every one of the 6 endpoints in §10 is anonymous. `csrf().disable()` at **line 18** carries the comment `//todo authenticate`. Session policy `STATELESS` (21). No `httpBasic`, no `formLogin`, no `oauth2ResourceServer`, no `@EnableMethodSecurity`, no `@PreAuthorize` on any method.
- The **permitted path list is therefore `/**`**, i.e. `POST/GET/PUT/DELETE /users/**` **and every actuator endpoint** Boot or the Admin client contributes.
- `security/JwtTokenFilter.java` is a `@Component` but is **never added to this chain** (`addFilterBefore` appears nowhere). Spring Boot still auto-registers a `@Component` `Filter` into the servlet-container chain, so it *does* run per request — but because everything is `permitAll`, the `Authentication` it puts in the `SecurityContext` (lines 45-51) is consulted by nothing, and a rejected token throws a bare `RuntimeException` (`:42`) that escapes to the container instead of a 401.

**(d) Does it issue or only validate JWTs — it contains code for both; only validation can run.**
- Library: **`io.jsonwebtoken:jjwt` 0.9.1** (`pom.xml:37-41`) — the legacy single-artifact API (no `jjwt-api`/`jjwt-impl`/`jjwt-jackson` trio here).
- **Validation:** `security/JwtUtil.java:25-27 getClaims` = `Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token)`; `:43-57 validateToken` maps `SignatureException`/`MalformedJwtException`/`ExpiredJwtException`/`UnsupportedJwtException` → `JwtTokenMalformedException` and `IllegalArgumentException` → `JwtTokenMissingException` (both extend Spring Security's `AuthenticationException`). Called by `JwtTokenFilter.java:40` and `:45`.
- **Issuing:** `JwtUtil.generateToken(String id)` (34-41) — `Jwts.builder().setClaims(...).setIssuedAt(...).setExpiration(now + ${jwt.token.validity}).signWith(SignatureAlgorithm.HS512, jwtSecret)`. **It has zero callers in this module** (the only `generateToken` hit besides its declaration), and the one endpoint that would use it (`POST /users/login`, `UserController.java:117-122`) does not call it. **Net: this service is written to be able to sign HS512 tokens but in practice only validates inbound ones — and since everything is `permitAll`, even validation grants nothing.**
- Algorithm note: HS512 with a **shared symmetric secret** (`jwt.secret`, `JwtUtil.java:18`) means any holder of that secret — the gateway and auth-service both read a JWT secret per Phase 3 notes — can mint tokens this service accepts. There is no audience, issuer or key-id check.

**(e) Calls out to another service — one, via plain `RestTemplate`.**
- **Client type: `RestTemplate`** — bean created as `new RestTemplate()` in `UserApplicationConfiguration.java:19-22`; injected at `UserController.java:28`.
- **Target: `person-service`, through the edge gateway**: constants `API_GATEWAY_URL = "http://localhost:3535"` (`:25`) + `API_PERSONS_URL = "/persons/"` (`:26`), single call `restTemplate.getForObject(API_GATEWAY_URL + API_PERSONS_URL + personId, PersonDto.class)` at **`:104`**, wrapped by `getPersonDto` (101-115).
- Used by **3 of 6 endpoints**: `POST /users` (`:34`), `GET /users/{id}` (`:63`), `PUT /users/{id}` (`:86`). Deserialised into a hand-maintained `controller/dto/PersonDto.java` (`id, uuid, firstName, lastName, email, birthday`).
- **`auth-service`, `account-service`, `notification-service`: no call of any kind exists in this module** — no URL, no client, no shared DTO. `notification-service` is only a sibling name; this service does not message it.
- **`WebClient`: absent** (no `spring-boot-starter-webflux`). **Feign: absent** — `spring-cloud-starter-openfeign` is declared nowhere in the repository, confirming Phase 3's hypothesis; the inter-service mechanism platform-wide is `RestTemplate` here (`auth-service` uses the same approach).
- Consequences to record: the URL is a **compiled-in `localhost` constant** (no `@Value`, no `lb://`, no `@LoadBalanced` → Consul discovery is bypassed even though the service registers in it), **no timeouts, no retry, no circuit breaker**, and a person-service outage becomes a **400** from this service.

---

## Gaps / not determined

1. Concrete driver, dialect, `ddl-auto`, datasource URL and `server.port` are **outside this component** — `user-service` ships only `bootstrap.yml`; the values live in `config-service/src/main/resources/config/user-service.yml`. The `ddl-auto: update`, `users_schema` and `:3307` figures are carried from `.opencode/rules/development.md:44-45` and `metadata.json:17`, and the driver class from that document's line 55 as recorded by the `config-service` analysis — not from a file inside this scope.
2. Whether `jwt.secret` here is the same value used by `gateway-service`/`auth-service` cannot be determined in scope; only the property name is visible.
3. Which handler Spring picks for the duplicate `/users/{x}` patterns (and whether startup fails instead) is a static inference — the application was not started and nothing was built, per the read-only constraint.
4. Resulting physical column names/types (`secret`, `qr_code`/`qrCode`, `person_id`, `TINYINT status`) follow Hibernate's implicit naming rules but were not verified — no schema, migration or test exists in the module.

## Recommendations

See `recommendations[]` in `user-service.json` (14 items). Ordered by risk: restore real authorisation + register `JwtTokenFilter` → fix the duplicate `/users/{x}` route → implement or delete `POST /users/login` and `UserServiceImpl.update` → wire or drop the RBAC tables → complete or remove TOTP and stop storing the secret in plaintext → `@Enumerated`/`Converter` for `status` + Flyway instead of `ddl-auto: update` → externalise the gateway URL and use `lb://person-service` with timeouts → `@Transactional` boundaries → narrow the global exception handler → align `source/target` to Java 17 → drop `commons-lang3` → add the first tests.
