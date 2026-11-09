# account-service — component analysis

| | |
|---|---|
| **Component** | `account-service` |
| **Path** | `account-service/` |
| **Kind** | `backend` (Spring Boot 2.7.5 / Java 17, Maven module) |
| **Coverage** | `full` — every text file in the module was opened (12 files, 11 opened; the one exception is a binary wrapper jar) |
| **Files read** | 12 module files + root `pom.xml` for parent/aggregator facts |
| **Generated** | 2026-11-10T12:00:00Z |

## Headline

**`account-service` is a Spring Initializr scaffold, not a service.** It compiles in the Maven reactor and is otherwise inert: 3 Java files, **36 lines of Java total**, **0 endpoints**, **0 entities**, **0 repositories**, **0 configuration classes**, **0 tests**, an **empty `application.properties`**, no Consul client, no config client, and no `account-service.yml` in config-service. It cannot start, is not registered in the mesh, has no gateway route, and nothing in the repository calls it. `git log -- account-service` returns exactly one commit: `668e39b "initial commit"`, 2023-01-20.

---

## 1. Entry points

| Item | Value |
|---|---|
| `@SpringBootApplication` class | `AccountServiceApplication` |
| Path | `account-service/src/main/java/pro/algotrade/accountservice/AccountServiceApplication.java` |
| Annotation line | `:6` |
| `main()` | `:9-11` → `SpringApplication.run(AccountServiceApplication.class, args)` (`:10`) |
| File length | 13 lines |
| Imports | exactly 2 — `org.springframework.boot.SpringApplication` (`:3`), `org.springframework.boot.autoconfigure.SpringBootApplication` (`:4`) |
| Explicit `@Configuration` classes | **0 — none in the module** |
| `@Enable*` annotations | 0 |
| `@ComponentScan` / `@PropertySource` tuning | none |
| Second entry point | none |

The intended *configuration* entry point is `src/main/resources/application.properties`, and it is **empty (one blank line)**. That single fact is what makes the module non-runnable (§10).

For contrast, the two structurally closest siblings each own a configuration class that this module lacks: `person-service/…/PersonApplicationConfiguration.java:11-12` and `user-service/…/UserApplicationConfiguration.java:12-13` (both declare a `ResourceBundleMessageSource`; neither has an account-service counterpart — see §6).

## 2. Folder structure — complete file inventory

12 files, exhaustive. Nothing was omitted.

| # | Path | Role |
|---|---|---|
| 1 | `pom.xml` | Maven module descriptor. Parent `pro.algotrade:algo-trade-platform:1.0` (`:5-9`); `artifactId` `account-service`, version `1.0`, name "Account Service" (`:11-14`); 5 dependencies (`:16-41`); sole build plugin `spring-boot-maven-plugin` with a Lombok exclusion (`:43-58`). **No `<dependencyManagement>` block** (`</project>` is the last line; the file is 60 lines). |
| 2 | `mvnw` | Maven Wrapper POSIX launcher, 316 lines, Apache ASF header — stock maven-wrapper 3.1.0, unmodified |
| 3 | `mvnw.cmd` | Maven Wrapper Windows launcher, 188 lines, stock, unmodified |
| 4 | `.mvn/wrapper/maven-wrapper.properties` | 2 lines: `distributionUrl` → Maven **3.8.6**, `wrapperUrl` → maven-wrapper **3.1.0** |
| 5 | `.mvn/wrapper/maven-wrapper.jar` | wrapper bootstrap jar — **binary, not opened** |
| 6 | `account-service.iml` | IntelliJ module file, 6 lines — carries only a `SonarLintModuleSettings` `uniqueId` (`:3-4`). No Checkstyle/PMD facet here despite the IDE-level plugins the platform configures. |
| 7 | `src/main/java/pro/algotrade/accountservice/AccountServiceApplication.java` | **the only entry point** (§1), 13 lines |
| 8 | `src/main/java/pro/algotrade/accountservice/model/common/utils/AccountTariff.java` | domain enum — `INVESTOR`/`TRADER`/`DEMO`, 17 lines |
| 9 | `src/main/java/pro/algotrade/accountservice/model/common/utils/TokenStatus.java` | enum — `AVAILABLE`/`EXPIRED`, 6 lines |
| 10 | `src/main/resources/application.properties` | **EMPTY** (1 blank line) — no property of any kind |
| 11 | `src/main/resources/message/data.properties` | 3 i18n keys, default (English) locale |
| 12 | `src/main/resources/message/data_rus.properties` | same 3 keys, Russian locale (`\uXXXX`-escaped) |

**Absent from the module (each individually checked):** no `src/test` directory at all, no `Dockerfile` (only `person-service` and `user-service` have one), no `bootstrap.yml`/`bootstrap.properties`, no `application.yml`, no `db/` migration folder, no `logback-spring.xml`, no `.api/`/OpenAPI spec, no `.gitignore`, no `README`, no `logs/`.

Package tree, complete:

```
pro.algotrade.accountservice                      → AccountServiceApplication
pro.algotrade.accountservice.model.common.utils    → AccountTariff, TokenStatus
```

Two packages. No `controller`, `service`, `repository`, `persistence`, `entity`, `dto`, `mapper`, `config`, `exception`, `security` or `web` package exists.

## 3. Architecture

**Pattern: none implemented — a scaffold.** Evidence:

- Only 2 packages and 3 types; the leaf package is `model/common/utils`, i.e. shared *value types*, not a layer.
- Annotation census over all 3 files: **0** `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`, `@Service`, `@Repository`, `@Entity`, `@Table`, `@Id`, `@Configuration`, `@Bean`, `@Transactional`, `@EntityScan`.
- No layer can be named because no layer is present: there is nothing to separate.
- The one architectural intent that *is* visible is the package name `model.common.utils`, which implies the author planned a `model` layer with `domain`/`dto` siblings, and stopped after the enums.
- Platform-level: `account-service` is the only module of the 8 with **zero** `org.springframework.cloud` dependency (§9a), so it sits outside the discovery/config architecture rather than inside it.

**Skeleton or functional? Skeleton — and a non-booting one.**

## 4. Dependencies (`account-service/pom.xml`)

Declared, 5 + 1 plugin. Versions are all inherited: the module has no `<dependencyManagement>` and no version tags; the root `pom.xml` (53 lines) also has no `<dependencyManagement>`, so everything resolves from `spring-boot-starter-parent:2.7.5` (root `pom.xml:7-12`) with `java.version` 17 (`pom.xml:31`) and `org.projectlombok.version` 1.18.24 (`pom.xml:34`).

| Artifact | POM lines | Scope | Actually imported in code? |
|---|---|---|---|
| `spring-boot-starter-data-jpa` | 17-20 | compile | **No** — 0 JPA imports, 0 entities, 0 repositories |
| `spring-boot-starter-web` | 21-24 | compile | **No** — 0 controllers, 0 servlet types |
| `com.mysql:mysql-connector-j` | 26-30 | `runtime` | **No** — never referenced; no `spring.datasource.*` property exists |
| `org.projectlombok:lombok` | 31-35 | `optional` | **No** — no `import lombok.*` in any of the 3 files; also excluded from the fat jar (`:49-55`) |
| `spring-boot-starter-test` | 36-40 | `test` | **No** — `src/test` does not exist |
| `spring-boot-maven-plugin` | 45-56 | build | n/a — repackages; the module's only plugin |

**Answer to "which are actually imported?" — none of them.** The only imports in the module resolve to `spring-boot` / `spring-boot-autoconfigure`, which arrive transitively and are not even declared here. Every one of the 5 declared dependencies is dead weight in its current state; `data-jpa` is worse than dead weight because it aborts startup (§10).

Not declared here, though the platform owns them: `spring-cloud-starter-consul-discovery`, `spring-cloud-starter-config`, `spring-cloud-starter-bootstrap`, `spring-cloud-starter-openfeign`, `mapstruct` (whose version *is* defined at root `pom.xml:35`), `spring-boot-starter-security`, `spring-boot-starter-actuator`, `spring-boot-admin-starter-client`, `spring-boot-starter-mail`.

## 5. Code quality

- **Test files: not found.** `account-service/src/test` does not exist. Zero test classes, zero test resources, despite `spring-boot-starter-test` being declared. No Jacoco, no Surefire/Failsafe configuration in this module.
- **Configuration in `src/main/resources/`: effectively none.** 3 files exist; the one that should carry configuration, `application.properties`, is **empty**. The other 2 are an unused i18n bundle. There is therefore no `spring.application.name`, no `server.port`, no `spring.datasource.*`, no `spring.jpa.*`, no `spring.cloud.*`, no logging config, no actuator exposure.
- **`config-service/src/main/resources/config/account-service.yml`: ABSENT — reported as a finding.** That directory contains exactly 4 documents: `gateway-service.yml`, `person-service.yml`, `notification-service.yml`, `user-service.yml`. **The service has no externalised configuration at all**, in either of the two places a Spring Boot app can get it. Combined with the empty `application.properties`, the service has **zero** resolved configuration.
- **No secrets in this module.** Nothing to redact: no credential property exists in any of the 3 resource files or in the POM. (Contrast the platform-wide inline-credential gap recorded in `.opencode/project_init.md` → Open Gaps, which concerns `config-service/src/main/resources/config/*.yml` and `auth-service` — files outside this scope.)
- **Tooling:** the Maven Wrapper *is* committed here (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/*`) — and in all 8 modules. That contradicts `.opencode/rules/development.md` "No Maven wrapper is committed — use a local `mvn`". Flagged for `/docs-sync`; not edited from this analysis.
- **Dead code: 100% of the module.** `AccountTariff` and `TokenStatus` are referenced by **0** files anywhere in the repository (repo-wide search matched only their own declarations). The i18n bundle is referenced by 0 files. `AccountServiceApplication` references nothing.

## 6. Code patterns

| Pattern | Evidence | Status |
|---|---|---|
| Single-class Spring Boot bootstrap, no `@Enable*` tuning | `AccountServiceApplication.java:6-12` | consistent with all 8 modules |
| Enum carrying a display string + getter | `AccountTariff.java:4-16` (`INVESTOR("investor")` … `getTariff()`) | matches the platform enum convention |
| Bare constant enum | `TokenStatus.java:3-6` | — |
| i18n `ResourceBundle` under `message/` with default + `_rus` locale | `message/data.properties:1-3`, `message/data_rus.properties:1-3` | **inert here** — see below |
| Lombok excluded from the repackaged jar | `pom.xml:49-55` | copied from siblings; no Lombok is used |
| Per-module Maven Wrapper scaffold | `.mvn/wrapper/maven-wrapper.properties:1-2` | all 8 modules |

**Entity annotations / repository / controller / mapping: none — "not found".** The only mapping-adjacent artefact is the i18n key naming, which is worth quoting because it is the single strongest clue to intent:

```
data.user.account.tariff.investor   → Investor / Инвестор
data.user.account.tariff.trader     → Trader   / Трейдёр
data.user.account.tariff.demo       → Demo     / Песочница
```

The prefix nests **account under user**, and the loader this bundle presupposes — a `ResourceBundleMessageSource` bean — exists only in `user-service/…/UserApplicationConfiguration.java:12` and `person-service/…/PersonApplicationConfiguration.java:11`. account-service duplicates the *bundle* but not the *bean*, and sets no `spring.messages.basename` (its only properties file is empty). This is copy-paste provenance from the sibling services, left half-applied.

## 7. API specs

**not found.** No `springdoc-openapi-ui` / `springdoc-openapi-api` dependency, no Swagger annotation, no `openapi.yaml`/`.json`, no Postman/Bruno collection, no `.http` files, no `@Api`/`@ApiOperation` annotations, no generated `docs/` for this module. Nothing in `account-service` describes an HTTP contract, because there is no HTTP surface (§10).

## 8–9. Business modules and entities

### Business modules (3, all tiny, all inert)

| Name | Path | Purpose |
|---|---|---|
| Account tariff / plan classification | `src/main/java/pro/algotrade/accountservice/model/common/utils/AccountTariff.java` | The module's only domain content: `INVESTOR("investor")`, `TRADER("trader")`, `DEMO("demo")` with `getTariff()` (`:4-16`) |
| Tariff label localisation (en + ru) | `src/main/resources/message/data.properties` (+ `data_rus.properties`) | 3 display labels per locale; 6 lines total; no loader bean exists |
| Token status classification | `src/main/java/pro/algotrade/accountservice/model/common/utils/TokenStatus.java` | `AVAILABLE`, `EXPIRED` (`:3-6`); no fields, no usage |

### Entities

**There are no entities.** Zero `@Entity`, `@Table`, `@Id`, `@GeneratedValue`, `@Enumerated`. Repo-wide search for `class|enum|interface Account\w*` matched only `AccountTariff` and `AccountServiceApplication` — **no `Account` type and no `AccountEntity` exists anywhere in the repository.**

**What does an `Account` mean here?** Answering from code, strictly:

- **Fields: none.** Nothing declares an account record.
- **Table name: none.** No `@Table`, no SQL, no schema, no migration.
- **id-based relation to person/user: none.** No `accountId`, `userId` or `personId` column, no `@ManyToOne`, no `@JoinColumn` anywhere in the module. The question is unanswerable from code, and is recorded in `gaps[]`.
- **The one inference the evidence supports** (labelled as inference, not fact): `AccountTariff`'s values are *investor / trader / demo*, where Russian `DEMO` = `Песочница` = *sandbox*; and the i18n prefix nests account under `user`. With the platform self-description in root `pom.xml:17-25` ("a strategy simulator based on actual market data … whether you are a professional trader or an investment newbie"), an `Account` is evidently a **per-user trading/subscription account with a plan tier** — a *commercial entitlement*, not a login. Login identity is owned elsewhere (`user-service` `UserEntity` + `auth-service` OAuth2 tokens). `TokenStatus` (`AVAILABLE`/`EXPIRED`) most plausibly qualifies a per-plan API/token allowance, but with no field, comment or usage this is unresolved — in `gaps[]`.
- **Naming hazard:** `user-service/…/UserEntity.java:42-43` already uses the word "account" in a *different* sense — `accountNonExpired` / `accountNonLocked`, Spring Security `UserDetails` flags. Whoever builds the account domain must disambiguate.

### Endpoint groups

**None — and this is a legitimate finding, not a gap in the analysis.** `endpointGroups: []` in the JSON.

Searched, over **every one of the 12 files** in the module, for: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`, `RouterFunction`, `@Bean`-declared `WebMvcContributor`, `server.servlet.context-path`. **Result: 0 matches.** The only HTTP path this process could ever answer is Boot's built-in `/error`. Verbatim gap recorded as instructed: *"no @RestController / @RequestMapping found in this module"*. No endpoint was invented.

| Path pattern | Methods | Count | Auth |
|---|---|---|---|
| — none — | — | **0** | n/a (no security, no resource-server config either) |

## 10. Persistence layer

| Aspect | Finding |
|---|---|
| Driver | `com.mysql:mysql-connector-j` declared `<scope>runtime</scope>`, `pom.xml:26-30`. Never referenced in code, never named in a property. |
| Dialect | **not set** — no `spring.jpa.database-platform`, no `spring.jpa.properties.hibernate.dialect` anywhere in the module |
| `ddl-auto` | **not set** — no `spring.jpa.hibernate.ddl-auto` in the module, and no `account-service.yml` in config-service to supply it |
| Migration tool | **none** — no Flyway, no Liquibase, no `src/main/resources/db`, no `.sql` file |
| Schema name | **not found.** Nothing in the repository provisions an accounts schema. (`persons_schema` belongs to `person-service`, `users_schema` to `user-service`; both are out of this scope.) |
| Datasource URL presence | **ABSENT.** `src/main/resources/application.properties` = 1 blank line; `config-service/src/main/resources/config/` has no `account-service.yml`. There is no other property source in the module. |
| Repository interfaces | **none** — 0 interfaces extending `JpaRepository` / `CrudRepository` / `PagingAndSortingRepository`; no `repository` package exists |
| Entities | **none** |

**Consequence (the load-bearing finding).** `spring-boot-starter-data-jpa` is on the classpath, so `DataSourceAutoConfiguration` runs. It finds no `spring.datasource.url`, and no embedded database is on the classpath (`mysql-connector-j` is not embedded). The context therefore fails with *"Failed to configure a DataSource: 'url' attribute is not specified"* before `main()` returns. **`java -jar target/account-service-1.0.jar` cannot start as committed.** Because there are no tests and nothing launches this service, that failure is invisible to the build: `account-service` compiles green in the reactor (root `pom.xml:45`) while being unbootable.

## 11. Named integrations

| Name | Package | Used in | Purpose |
|---|---|---|---|
| MySQL | `com.mysql:mysql-connector-j` (runtime) | `pom.xml:26-30` declaration **only** | intended persistence target; never configured, never reached |
| Spring Data JPA / Hibernate | `spring-boot-starter-data-jpa` | `pom.xml:17-20` declaration **only** | intended ORM; inert, and actively aborts startup |
| Spring Web MVC | `spring-boot-starter-web` | `pom.xml:21-24` declaration **only** | intended HTTP transport; 0 mappings |

Explicitly searched for and **not found**: `spring-cloud-starter-consul-discovery`, `spring-cloud-starter-config`, `spring-cloud-starter-bootstrap`, `spring-cloud-starter-openfeign`, `RestTemplate`, `RestTemplateBuilder`, `WebClient`, `spring-boot-starter-security`, `spring-boot-starter-actuator`, `spring-boot-admin-starter-client`, `spring-boot-starter-mail`, `aerogear-otp-java`, `zxing`, any message broker, any cache. **The module performs no I/O of any kind.**

## 12. Mesh membership and reachability

### (a) Registered in Consul? Referenced in gateway routes? → **Neither. It is orphaned.**

Confirmed evidence for the brief's premise:

- `account-service/pom.xml` (60 lines, read in full) declares **no `spring-cloud-starter-consul-discovery`, no `spring-cloud-starter-config`, no `spring-cloud-starter-bootstrap`** — and no `<dependencyManagement>` importing the Spring Cloud BOM, so it could not resolve a Spring Cloud artifact without an edit. `account-service` is the **only** module of 8 with zero `org.springframework.cloud` dependency.
- All **7** other modules declare `spring-cloud-starter-consul-discovery`: `admin-service/pom.xml:20`, `user-service/pom.xml:85`, `auth-service/pom.xml:48`, `gateway-service/pom.xml:46`, `config-service/pom.xml:31`, `person-service/pom.xml:46`, `notification-service/pom.xml:52`. **4** additionally carry `spring-cloud-starter-bootstrap` + `spring-cloud-starter-config` (`user-service:45/50`, `gateway-service:20/25`, `person-service:25/30`, `notification-service:26/31`).
- No `bootstrap.yml` exists in this module, so there is no config-service import even in principle.
- **Gateway routes: no account route.** `config-service/src/main/resources/config/gateway-service.yml` declares exactly **3** routes — `uri: lb://auth-service` / `Path=/auth/**` (`:40-42`), `lb://user-service` / `Path=/users/**` (`:45-47`), `lb://person-service` / `Path=/persons/**` (`:51-53`). A search for `account` across the whole `config/` directory returns **no matches**.
- The gateway does set `spring.cloud.gateway.discovery.locator.enabled: true` (`gateway-service.yml:37`), which *would* auto-route any Consul-registered service under `/account-service/**`. It cannot help here: the locator is driven by the registry, and account-service never registers.

**Implication.** Registration in this platform is auto-configured purely from the discovery starter being on the classpath (no `@EnableDiscoveryClient` is used anywhere). With that starter absent, this process — if it started — would be a plain standalone Boot app: no `spring.application.name` (so no meaningful service id), no Consul registration, no externalised config, and an OS-assigned or default port. It would be **invisible to the mesh and unreachable through the edge**, i.e. it is architecturally outside the platform regardless of the DataSource defect.

### (b) Is it reachable today? → **No.** Five independent blockers:

1. It does not start (DataSource auto-configuration failure, §10).
2. It cannot register in Consul (no discovery client).
3. It has no explicit gateway route (§12a).
4. The gateway's discovery locator has nothing to discover.
5. No `Dockerfile` for this module and no `docker-compose` in the repository, so nothing starts it; and **0** Java references from any sibling module mean nothing calls it.

### (c) Is it a work in progress? → **Yes — started, then abandoned.**

Evidence: 1 commit ever (`668e39b`, 2023-01-20); 36 lines of Java; 2 enums referenced nowhere; an i18n bundle copied from the siblings without its loader bean; an `application.properties` created and left empty; a `model.common.utils` package name that implies a `model` layer never built. It reads as Spring Initializr scaffolding plus a handful of types moved over from `user-service`, committed and dropped.

**Minimum to make it functional** (in dependency order):

1. **Configuration.** Either populate `src/main/resources/application.properties` — `spring.application.name=account-service`, `server.port`, `spring.datasource.url/username/password/driver-class-name`, `spring.jpa.*` with an explicit schema — **or** match the 4 config-driven siblings: add `spring-cloud-starter-bootstrap` + `spring-cloud-starter-config` + `spring-cloud-starter-consul-discovery` plus a `spring-cloud-dependencies` `<dependencyManagement>` import to this pom, and create `config-service/src/main/resources/config/account-service.yml`. Credentials must not be inlined (platform secrets gap).
2. **Schema.** Provision the MySQL schema it would own — nothing in this repository creates one — and choose schema management deliberately (Flyway/Liquibase rather than `ddl-auto: update`).
3. **Model.** An `Account` `@Entity` with `@Id` + `@Table` and the intended id-based reference to a user; make `AccountTariff` live as `@Enumerated(EnumType.STRING)` or via an `AttributeConverter`.
4. **Layers.** ≥1 `JpaRepository`, ≥1 `@Service`, ≥1 `@RestController` + request/response DTOs (MapStruct is *not* declared here, unlike the siblings — adding it is a dependency decision needing approval).
5. **Reachability.** An explicit gateway route (`Path=/accounts/**` → `lb://account-service`), or rely on the discovery locator once Consul registration exists; plus resource-server/JWT config before anything is exposed.
6. **First test.** `spring-boot-starter-test` is already declared; `src/test` does not exist.

## 13. Cross-component dependencies (paths recorded, not followed)

| Target | Via |
|---|---|
| `pom.xml` | Maven parent `pro.algotrade:algo-trade-platform:1.0` (`account-service/pom.xml:5-9`); aggregator `<module>account-service</module>` (`pom.xml:45`); Boot 2.7.5 + Java 17 inherited (`pom.xml:7-12`, `:31`). Build-time only. |
| `config-service/src/main/resources/config/` | **No dependency in either direction** — no `account-service.yml` there, no config-client here. |
| `gateway-service` | **No route** — 3 explicit routes only; discovery locator cannot compensate (§12a). |
| `user-service` | **Copy-paste provenance only, not a call** — `data.user.account.tariff.*` key prefix and the un-duplicated `ResourceBundleMessageSource` pattern (`user-service/…/UserApplicationConfiguration.java:12`). |
| `person-service` | **No dependency** — 0 references either way. |

## 14. Gaps

1. **"no @RestController / @RequestMapping found in this module"** — verbatim, as instructed. Searched 0 controllers / 0 request mappings / 0 verb mappings across all 12 files; `endpointGroups` is legitimately empty.
2. **No entity exists**, so the Account concept has no fields, no table name and no id-based relation to person/user in code. Trading account vs authentication account is **undetermined**; the tariff labels + i18n prefix + platform description point to a per-user trading/subscription account (authentication living in `user-service` + `auth-service`) — **inference, not code fact**.
3. **`TokenStatus`'s referent is undetermined** — what token it qualifies is unresolvable from 6 lines with no usage.
4. **The intended database cannot be identified** — no URL, dialect, `ddl-auto` or schema anywhere for this module.
5. **API specs: not found** (§7).
6. `coverage` is `full` for files read, but the module is too incomplete to answer the business questions a functional service would answer.
7. The only module file not opened is `.mvn/wrapper/maven-wrapper.jar` (binary wrapper jar).
8. Out-of-scope checks were **grep-only, path-cited, not analysed**: sibling `pom.xml` files, root `pom.xml`, `config-service/src/main/resources/config/` listing, and `gateway-service.yml` route lines — each consulted solely to answer the mesh-membership question the brief poses.

## 15. Recommendations

1. **Count the platform as 7 running services + 1 scaffold.** Every statement of the form "8 microservices" should carry that caveat while `account-service` stays in this state.
2. **Resolve domain ownership before writing code** — does `user-service` already own "account"? Note the collision with `UserEntity.java:42-43`'s Spring Security `accountNonExpired`/`accountNonLocked` naming.
3. **If a datasource is added, externalise the credentials** — do not extend the platform's inline-YAML credential problem into this module.
4. **Retire or activate the two dead enums** in the same change that introduces the entity; leaving `AccountTariff`/`TokenStatus` in `model.common.utils` invites reuse of an unowned type.
5. **Documentation impact outside this scope, for `/docs-sync` (not edited here):** `.opencode/rules/development.md:33` and `:64` present `account-service` as a JPA+MySQL persistence owner, which overstates reality (dependencies present, usage nil); and the same file's "No Maven wrapper is committed" is inaccurate — `mvnw`/`mvnw.cmd` are committed in all 8 modules.
6. **If it will not be finished,** removing `<module>account-service</module>` from `pom.xml:45` is cleaner than carrying a scaffold that inflates every architecture count.

---

*Report generated by `codebase-analyzer` for initialization Phase 4. Machine-readable twin: `account-service.json`.*
