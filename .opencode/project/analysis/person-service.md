# person-service — component analysis (Phase 4)

- **Path:** `person-service/` · **Kind:** backend · **Coverage:** full (every tracked file opened; 26 files read)
- **Stack:** Spring Boot 2.7.5 / Java 17 parent, Spring Cloud 2021.0.5, MySQL `persons_schema`, `server.port: 0` → Consul-discovered
- **Size:** 16 Java files, 9 packages, **1 entity, 1 repository, 1 controller, 4 endpoints, 0 tests, 0 validation annotations, 0 outbound clients**
- **One-line verdict:** a textbook single-resource CRUD service — the platform's *person* registry — whose interesting content is not its code but the **unconstrained `userId` reference to user-service** and the **absent validation, tests and schema migration**.

---

## 1. Entry points

`PersonServiceApplication.java:6-11` is the only `@SpringBootApplication`; `main()` is the stock `SpringApplication.run`. The only other configuration class is `PersonApplicationConfiguration.java:7-16`, a `@Configuration` publishing a single `@Bean ResourceBundleMessageSource` (basename `message/exception_message`, `useCodeAsDefaultMessage(true)`) that the global exception handler consumes. **No** `@EnableDiscoveryClient`, `@EnableFeignClients`, `@EnableCaching`, `@EnableScheduling` or `@EnableConfigurationProperties` exists anywhere in the module — every platform behaviour (Consul registration, config client, Boot Admin) is classpath-auto-configured, never annotated.

The module ships **only** `src/main/resources/bootstrap.yml` (3 lines: `spring.application.name: person-service`, `spring.config.import: optional:configserver:${CONFIG_SERVER:http://localhost:8888/}`) plus the two message bundles — **there is no `application.yml`**, so the service literally has no runtime configuration of its own. `Dockerfile` (4 lines): `FROM openjdk:17` → `EXPOSE 8080` → `ADD target/person-service-1.0.jar` → `ENTRYPOINT ["java","-jar","/person-service-1.0.jar"]`; single layer, no non-root `USER`, no `HEALTHCHECK`, and the `EXPOSE 8080` is inert because the delivered config sets `server.port: 0`. `mvnw`/`mvnw.cmd` + `.mvn/wrapper/maven-wrapper.properties` (Maven 3.8.6, wrapper 3.1.0) are committed **here**, which contradicts `development.md → "No Maven wrapper is committed"`.

## 2. Folder structure — actual layering convention

`src/main/java/pro/algotrade/personservice/` — package-by-technical-layer, flat, no `impl/`, no `config/` at root:

| Package | Files | Contents |
|---|---|---|
| `…personservice` | 2 | `PersonServiceApplication`, `PersonApplicationConfiguration` |
| `…controller` | 1 | `PersonController` — all 4 endpoints |
| `…controller.dto` | 2 | `PersonRequest`, `PersonResponse` (DTOs nested under controller, not a `dto` root package) |
| `…service` | 2 | `PersonService` interface **and** `PersonServiceImpl` in one package |
| `…persistence` | 1 | `PersonEntity` — package is `persistence`, **not** `entity`/`model`/`domain` |
| `…persistence.repository` | 1 | `PersonRepository` (repository is a child of `persistence`) |
| `…mapper` | 1 | `PersonMapper` (MapStruct) |
| `…exception` | 3 | `PersonServiceGlobalRuntimeException` + 2 subclasses |
| `…exception.config` | 3 | `PersonGlobalExceptionHandler`, `ErrorResponse`, `GlobalErrorCode` — web/error plumbing nested under `exception.config` |

`src/test` **does not exist**. `src/main/resources` = `bootstrap.yml` + `message/exception_message{,_rus}.properties`. Tracked total 26 files (`git ls-files person-service`); `.idea/**` (9 files, incl. an imported MySQL data-source cache) and `person-service.iml` exist on disk but are **untracked** — correctly excluded by `.gitignore:16-20`.

## 3. Architecture

**Classification: single-resource CRUD microservice — a 4-layer Spring Boot service in a sleeve.** `controller → service(interface+impl) → Spring Data JPA repository → MySQL`, with a MapStruct mapper at the controller edge and one `@ControllerAdvice`. It is a **leaf callee**: no orchestration, no messaging, no security configuration, no caching, no batching, no scheduler.

**MapStruct vs manual mapping — MapStruct dominant, not exclusive.** 2 of 3 mapping sites use MapStruct (`PersonMapper.java:16-20`: `dtoToEntity` with `@Mapping(target="uuid", ignore=true)`, `entityToDto` with `@InheritInverseConfiguration`), reached through a **static** `Mappers.getMapper` INSTANCE (`PersonMapper.java:14`) — unlike every collaborator in the module, which is constructor-injected, so the mapper is unmockable without a static-mock library. The **update path bypasses MapStruct entirely** with `BeanUtils.copyProperties(personRequest, personEntity, "id", "uuid")` (`PersonServiceImpl.java:35`). Two mapping idioms in a 44-line service class.

## 4. Dependencies (`person-service/pom.xml`) — imported in code vs declared only

| Artifact | Version | Imported in code? |
|---|---|---|
| `spring-boot-starter-web` | 2.7.5 managed | **yes** — `PersonController.java:6-7`, `PersonGlobalExceptionHandler.java:7-9` |
| `spring-boot-starter-data-jpa` | 2.7.5 managed | **yes** — `PersonEntity.java:5` (`javax.persistence.*`), `PersonRepository.java:3` |
| `mapstruct` + `mapstruct-processor` | 1.5.3.Final (`pom.xml:58,111`) | **yes** — `PersonMapper.java:3-6,11-14` |
| `lombok` (provided + processor) | 1.18.24 | **yes, pervasively** — `@Data` ×4, `@RequiredArgsConstructor` ×3, `@Slf4j` ×2, `@Getter`, `@Builder`, `@NoArgsConstructor` |
| `spring-cloud-starter-bootstrap` | 2021.0.5 BOM | no — declarative; its only job is making `bootstrap.yml` be read |
| `spring-cloud-starter-config` | 2021.0.5 BOM | no — declarative via `bootstrap.yml:3` |
| `mysql-connector-j` (runtime) | Boot-BOM managed | no — referenced only as `driver-class-name` (`person-service.yml:48`) |
| `spring-cloud-starter-consul-discovery` | 2021.0.5 BOM | no — auto-configured; configured at `person-service.yml:35-42` |
| `spring-boot-admin-starter-client` | 2.7.7 | no — auto-configured; configured at `person-service.yml:21-25` |
| `spring-boot-starter-test` (test) | 2.7.5 managed | **declared, entirely unused** — `src/test` absent |

**Absent, and each absence is load-bearing:** `spring-boot-starter-validation` (→ no `@Valid`), `spring-boot-starter-security` (→ no local auth), `spring-cloud-starter-openfeign` and `spring-boot-starter-webflux` (→ **no `WebClient` even on the classpath**), `spring-boot-starter-mail`. Build side: only `spring-boot-maven-plugin` + `maven-compiler-plugin:3.8.1`, and **`<source>10</source><target>10</target>` (`pom.xml:100-101`)** while the parent sets `java.version 17` (`pom.xml:31`) and the image is `openjdk:17`.

## 5. Code quality

- **Test files: not found.** No `src/test` directory at all; `git ls-files` returns 26 files, none a test; `spring-boot-starter-test` declared and unused. Verification of any change here is manual and runtime-only.
- **Lint/format config: not found** in the module — no checkstyle/PMD/SpotBugs/EditorConfig/Sonar file. Per `development.md` those three tools exist only as IntelliJ project files, so **nothing is enforced in the Maven build**.
- **TODO/FIXME/XXX/HACK: 0** occurrences in the whole module.
- No Surefire/Failsafe/Jacoco/Enforcer configuration; no CI file in the module (or in the repository).

## 6. Code patterns

- **Validation: none, at any layer.** No `@Valid`, `@NotNull`, `@NotBlank`, `@Email`, no validation starter. `POST /persons` persists arbitrary input, **including a `userId` it never checks exists** (`PersonServiceImpl.java:19-23`).
- **Exception handling — two shapes, one status code.** Typed errors: an unchecked exception carrying `(i18n message key, Long code)` → `PersonGlobalExceptionHandler.java:21-32` resolves the key through the `MessageSource` and returns `ErrorResponse{code, message}` (HTTP 400). **Everything else**: `:34-39` catches `Exception` and returns `badRequest().body("Exception occurred inside Person Service" + e)` — a bare string containing the exception `toString`. A missing person, a malformed body and a SQL failure are all HTTP 400 with three different bodies. Codes: `GlobalErrorCode.java:7-8` → `1000` entity-not-found, `1001` already-registered.
- **i18n:** keys `exception.person.not.found` / `exception.person.already.registered` in `message/exception_message.properties:1-2` and `…_rus.properties:1-2`. (The Russian rendering of *person* not-found is literally "the **user** is not registered".)
- **Transaction boundaries: none.** 0 `@Transactional` module-wide → `update` (findById→save, `:33-38`) and `delete` (findById→delete, `:26-30`) each run as two independent transactions.
- **DTO mapping:** see §3. Additional smell: the service interface returns `PersonEntity`, not a DTO (`PersonService.java:8-14`), so the JPA type crosses the service boundary and the controller does the conversion.
- **Logging:** Lombok `@Slf4j`, **INFO level, whole DTOs** — `PersonController.java:23,34,43` log `PersonRequest`/`PersonResponse` via the Lombok `toString`, i.e. `firstName`, `lastName`, `email`, `birthday` into `logs/person-service.log`.

## 7. API specs — **not found**

No OpenAPI/Swagger dependency, annotation or document; no Postman/Bruno/`.http` collection; **no `.md` file of any kind in the module, not even a README**. The only contract evidence is `pom.xml:14` ("Service to manage AlgoTrade Platform Persons") and the four handler signatures.

## 8. Business modules

| Module | Path | Purpose |
|---|---|---|
| Person registry REST API | `person-service/src/main/java/pro/algotrade/personservice/controller` | the whole public surface — 4 CRUD handlers |
| Person domain service | `…/personservice/service` | mints the server-side UUID (`PersonServiceImpl.java:20`), existence check (`:27,:42`), update copy (`:35`) |
| Person persistence | `…/personservice/persistence` | `PersonEntity` (`t_persons`) + `PersonRepository` |
| Person error contract & localisation | `…/personservice/exception` (+ `src/main/resources/message`) | code+key exceptions, `ErrorResponse`, EN/RU bundles |
| Person DTO↔entity mapping | `…/personservice/mapper` | MapStruct `PersonMapper` |

There is exactly **one** business capability in this service. No billing, no state machine, no workflow.

## 9. Top entities

### `PersonEntity` — `…/persistence/PersonEntity.java` — table **`t_persons`**

| Field | Type | Notes |
|---|---|---|
| `id` | `Long` | `@Id @GeneratedValue(IDENTITY)` (`:12-14`) — surrogate PK **and** the id used in the REST path |
| `uuid` | `String` (`:15`) | assigned `UUID.randomUUID().toString()` server-side (`PersonServiceImpl.java:20`); **no unique constraint, never queried, never returned** to any client |
| `firstName` / `lastName` / `email` | `String` (`:16-18`) | no `@Column` metadata at all; `email` has no uniqueness constraint and no `@Email` |
| `birthday` | `java.util.Date` (`:19`) | legacy date type, not `LocalDate` |
| `userId` | `Long` (`:20`) | **plain numeric reference to a platform user** |

**Relations — reported as the code says, no FK assumed:**
- `userId → user-service` is a **logical reference only**: no `@ManyToOne`/`@OneToOne`, no `@JoinColumn`, no `@Table(foreignKeys=…)`, no join table. Nothing verifies the target exists before persisting it.
- **Circular id pair across services:** person stores `userId`; per the sibling artifact `.opencode/project/analysis/user-service.json`, `UserEntity.personId` (its line 31) is *also* a plain column pointing back at `Person`. Two services each persist the other's id, neither constrained, neither able to detect the other's deletion.
- `uuid` is written but **unreachable**: `entityToDto` declares no uuid mapping and `dtoToEntity` ignores it (`PersonMapper.java:16-20`).
- No collections, embeddables or inheritance — this is the module's **only** `@Entity`.

## 10. Top endpoint groups — 2 groups, 4 operations, 1 controller

| Pattern | Methods | Count | Version | Auth | Source |
|---|---|---|---|---|---|
| `/persons` | POST | 1 | none | **none in this module** | `PersonController.java:21-28` |
| `/persons/{id}` | GET, PUT, DELETE | 3 | none | **none in this module** | `PersonController.java:30-36, 38-45, 47-52` |

- No `/api` or `/vN` prefix anywhere; no versioning dependency → **version: none**.
- **Auth:** no `spring-boot-starter-security` dependency, no `@PreAuthorize`, no filter chain — *nothing* is enforced here. Externally, the config-service artifact records route `person-service-in` → `Path=/persons/**` → `lb://person-service` **with the `AuthFilter`** (`gateway-service.yml:50-53`, cited from `.opencode/project/analysis/config-service.json`; the gateway itself was not read). Because `{id}` is the raw numeric PK, ids are enumerable, and anyone who reaches the ephemeral port directly is unauthenticated.
- Response quirks: `POST` answers **200, not 201**, with no `Location`; `DELETE` answers `200 + Boolean` that is *always* `true`, so a failed delete is indistinguishable from a successful one.

## 11. Named integrations

| Integration | Package / endpoint | Where | Purpose / compliance |
|---|---|---|---|
| **MySQL 8 `persons_schema`** | `com.mysql:mysql-connector-j`, driver `com.mysql.cj.jdbc.Driver` | `person-service.yml:44-48`; `PersonRepository.java:8` | sole datastore. **Credentials committed in plain text** at `config-service/src/main/resources/config/person-service.yml:46-47` as `spring.datasource.username` / `spring.datasource.password` (values intentionally not reproduced). No Flyway/Liquibase. |
| **HashiCorp Consul** | `spring-cloud-starter-consul-discovery` | `pom.xml:44-47`; `person-service.yml:35-42` | registers service id `person-service`. `register-health-check: false` → Consul never evicts a dead instance; host/port hardcoded to `localhost:8500` with **no env override**. |
| **Spring Cloud Config (`config-service`)** | `spring-cloud-starter-bootstrap` + `spring-cloud-starter-config` | `bootstrap.yml:3` | supplies *all* runtime config. `optional:` prefix ⇒ boots without config-service, then dies on DataSource with a misleading error. |
| **Spring Boot Admin + Actuator** | `de.codecentric:spring-boot-admin-starter-client:2.7.7` | `person-service.yml:21-25, 16-19` | registers with `${ADMIN_SERVER:http://localhost:5555/}`. **`management.endpoints.web.exposure.include: "*"`** on a plain-HTTP ephemeral port with no security dependency — `/env` would echo the datasource password above. |
| **SMTP / mail** | **not found** | — | no mail starter here; `email` is only a column, never a transport. *But* PII (name, email, birthday) is written to `logs/person-service.log` at INFO on every request — a data-minimisation issue. |

## 12. Persistence layer

- **Driver:** `com.mysql.cj.jdbc.Driver` (`person-service.yml:48`). **Pool:** HikariCP defaults, untuned.
- **Dialect:** **not configured** — no `spring.jpa.database-platform` / `hibernate.dialect` in the module or in the delivered document; Hibernate infers the MySQL 8 dialect from JDBC metadata at runtime.
- **`hibernate.ddl-auto: update` — CONFIRMED** at `config-service/src/main/resources/config/person-service.yml:28-29`, together with `show-sql: true` (`:30`) and `org.hibernate.SQL: debug` + `type.descriptor.sql: trace` (`:10-14`). The brief's suspicion was right: the module's own `src/main/resources` carries **only** `bootstrap.yml`, so every one of these values genuinely originates in config-service.
- **Schema:** `persons_schema` @ `jdbc:mysql://localhost:3306` (`:45`). One generated table, `t_persons`. No `.sql` file, no migration tool, no `@Column` overrides → physical column names follow Spring's implicit naming strategy (`firstName` → `first_name`).
- **Spring Data repositories (complete list — 1):** `…/persistence/repository/PersonRepository.java`, `@Repository interface … extends JpaRepository<PersonEntity, Long>` — **zero** custom methods: no derived query, no `@Query`, no `Pageable`/`Sort`, no `Specification`, no custom fragment. Every lookup in the service is `findById`.
- **Transactions:** none (see §6).

## 13. The four explicit questions — with file:line

**(a) Is this the platform's person/customer registry, and what does `Person` represent?**
Functionally **yes**, but a very thin one. `pom.xml:14` — "Service to manage AlgoTrade Platform Persons". In code `PersonEntity` carries **only demographic identity**: `id`, a server-minted `uuid`, `firstName`, `lastName`, `email`, `birthday`, plus a `userId` pointer (`PersonEntity.java:12-20`). There is **no** trading- or customer-lifecycle state — no account, balance, entitlement, tariff, KYC, address or document — and no relation to `account-service`. So *Person* = **the people/customer profile record belonging to a platform user, and nothing else**. The author treats *person* and *user* as near-synonyms: `exception.person.not.found` is rendered in Russian as "the **user** is not registered" (`exception_message_rus.properties:2`) and the duplicate-key error constant is named `ERROR_USER_ALREADY_REGISTERED` (`GlobalErrorCode.java:8`).

**(b) Does it call another service, and with which client?**
**No — zero outbound calls.** 0 occurrences of `RestTemplate`, `WebClient`, `FeignClient`, `@EnableFeignClients`, `ExchangeStrategies`, `HttpClient` in the Java sources. The module's *only* textual "WebClient" hit is `System.Net.WebClient` in the Maven wrapper script `mvnw.cmd:145` — not application code. The pom confirms it: no `openfeign`, no `webflux`, so a `WebClient` could not even compile here. Consequence: `PersonRequest.userId` is persisted unverified (`PersonServiceImpl.java:19-23`). **person-service is a pure callee.** For orientation only — cited from the sibling *artifact*, not from sibling source — the platform's inter-service client is **`RestTemplate`**, and it is **user-service that calls person-service through the gateway**: `GET http://localhost:3535/persons/{personId}` (`UserController.java:25,104` per `.opencode/project/analysis/user-service.json`).

**(c) How is it registered in Consul, and why a random port?**
Annotation-free auto-registration: `spring-cloud-starter-consul-discovery` on the classpath (`pom.xml:44-47`) + the bootstrap context re-enabled (`pom.xml:23-31`, `bootstrap.yml`) ⇒ Spring Cloud Consul registers the app under service id **`person-service`** (`spring.application.name`, `bootstrap.yml:2`) at `spring.cloud.consul.host: localhost`, `port: 8500`, with `instance-id: "${spring.cloud.client.hostname}_${spring.application.name}:${random.value}"` and `register-health-check: false` (`person-service.yml:35-42`). No `@EnableDiscoveryClient` is needed on Boot 2.x and none exists. It runs on **`server.port: 0`** (`person-service.yml:1-2`) so the OS assigns an ephemeral port every boot; the fixed address is replaced by Consul name resolution at the gateway, and the `${random.value}` suffix is what lets several instances of the same service coexist on one host without registry collisions. Two practical consequences: `EXPOSE 8080` in the `Dockerfile` is meaningless, and **no document, script or test may hardcode a person-service port**.

**(d) Does anything consume `person` data from user-service? (data-duplication finding)**
**Nothing inside person-service consumes or replicates user-service data** — no client, no listener, no cache, no scheduled sync, and no inbound integration point other than the 4 handlers. What is provable in scope: the field set `{firstName, lastName, email, birthday, userId}` is repeated **verbatim three times** — `PersonEntity.java:16-20`, `PersonRequest.java:9-13`, `PersonResponse.java:9-14` — while the entity stores its *own* `email` and simultaneously points at another aggregate via `userId`.
**Possible data-duplication finding, corroborated from the sibling artifacts (not from sibling source):** per `.opencode/project/analysis/user-service.json`, user-service holds `UserEntity.personId` as a plain column **and** hand-maintains `controller/dto/PersonDto.java` mirroring `(id, uuid, firstName, lastName, email, birthday)`, embedding it in `UserResponse.person`. The demographic block **is** therefore stored twice across the platform: person-service is the write side, user-service keeps an **unversioned, hand-copied read model**. Two concrete contract drifts are visible from this side: (i) `PersonResponse` does **not** expose `uuid` (`PersonResponse.java:9-14`) while the sibling mirror is recorded as containing `uuid` — with Jackson `NON_NULL` (`person-service.yml:32-33`) the field is simply absent; (ii) `PersonResponse` **does** expose `userId`, which the mirror is not recorded as having. Highest-value follow-up: settle whether `uuid` is the external identifier — it is minted (`PersonServiceImpl.java:20`), mapped away (`PersonMapper.java:16`), never unique-constrained and never queried.

## 14. Cross-component dependencies (targets only — siblings not walked)

| Target | Via |
|---|---|
| `config-service` | `spring.config.import: optional:configserver:${CONFIG_SERVER:http://localhost:8888/}` (`bootstrap.yml:3`) — no compile-time dep, but no local `application.yml` either |
| `admin-service` | Boot Admin client registration to `${ADMIN_SERVER:http://localhost:5555/}` (`person-service.yml:22-25`) |
| `user-service` | **logical id references only, in both directions** — `PersonEntity.userId`/`PersonRequest.userId` here; `UserEntity.personId` + hand-copied `PersonDto` there. No HTTP call, no FK, no shared artifact |
| `gateway-service` | **inbound only**: `lb://person-service`, `Path=/persons/**`, `AuthFilter` — recorded in the config-service artifact; the gateway was not read |
| external MySQL `localhost:3306/persons_schema` | JDBC (`person-service.yml:45,48`); nothing in the repo starts it (no compose file) |

## 15. Recommendations (priority order)

1. **Add validation**: `spring-boot-starter-validation` + `@NotBlank`/`@Email`/`@NotNull` on `PersonRequest`, `@Valid` at `PersonController.java:22,:39` — and decide whether `userId` must be verified.
2. **One error shape, honest statuses**: `PersonGlobalExceptionHandler.java:34-39` returns a raw string for all unexpected errors and 400 for everything; use `ErrorResponse` everywhere and 404 for `ERROR_ENTITY_NOT_FOUND`.
3. **Introduce Flyway/Liquibase** before `t_persons` holds real customer data — `ddl-auto: update` cannot express the unique constraints `uuid`/`email` need, and there is no schema history.
4. **Settle the person/user boundary** (see §13d): stop storing the same demographic block in two services, or document person-service as the identity owner; resolve the circular `personId ↔ userId` pair.
5. **Decide the `uuid` contract** — expose + constrain + query it, or delete the field.
6. **Delete dead code**: `PersonAlreadyRegisteredException` and `ERROR_USER_ALREADY_REGISTERED` (1001) are thrown nowhere.
7. **Fix the build drift**: drop `<source>10</source><target>10</target>` (`pom.xml:100-101`) so the module inherits Java 17.
8. **`@Transactional`** on `PersonServiceImpl.update`/`delete` (or a single bulk update).
9. **Stop logging whole person DTOs at INFO** (`PersonController.java:23,34,43`); mask `email`.
10. **Rotate + externalise** the datasource credentials (`person-service.yml:46-47`, by property name) and narrow `management.endpoints.web.exposure.include` (`:18`); set `register-health-check: true`.
11. **Add the first tests**: `@WebMvcTest` of `PersonController` + `@DataJpaTest` of `PersonRepository` — 4 endpoints, 1 repository, 0 tests today.

## 16. Gaps / not determined

1. `user-service` source was **not** read (out of scope). §13d rests on person-service source **plus** the pre-existing artifact `.opencode/project/analysis/user-service.json`; a direct read of `UserEntity.java` / `PersonDto.java` would close it.
2. The gateway route table and `AuthFilter` claim requirements were not read — "auth: none" describes only what **this module** enforces, not what an external client faces.
3. The effective Hibernate dialect and the real generated DDL of `t_persons` were not inspected (no live MySQL, no dump; the committed `.idea/dataSources` schema cache covers only MySQL system schemas).
4. Whether the **deprecated** `logging.file.max-size`/`max-history` keys (`person-service.yml:7-8`) actually cap the log was not verified — no instance was started; the config-service report raises the same doubt.
5. No test or CI convention could be inferred: `spring-boot-starter-test` is declared with zero tests, and no pipeline file exists.

---
*Secret handling: no credential value is reproduced in this report. The MySQL credentials are cited by file, line and property name only — `config-service/src/main/resources/config/person-service.yml:46-47` (`spring.datasource.username` / `spring.datasource.password`).*
