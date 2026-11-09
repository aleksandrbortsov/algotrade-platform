# notification-service — Component Analysis

| | |
|---|---|
| Component | `notification-service` |
| Path | `notification-service` |
| Kind | `backend` (Spring Boot 2.7.5 / Java 17) |
| Coverage | **full** — every analytically meaningful file in the module was read (8 of 12; binaries and launcher scripts excluded) |
| Files read | 13 (budget 35) — 8 in scope, 3 out of scope because the brief required them, plus report tooling |
| Generated | 2026-11-09T19:14:07Z |

## 0. Headline finding

This is **not a notification API**. It is a **scheduled background job packaged as a web application**: 4 Java files, **0 controllers**, **0 endpoints**, **0 domain types**, **0 tests**, **0 persistence**. Exactly one thing ever happens at runtime — once per 24 h a `@Scheduled` method sends the *same* hard-coded HTML email with the *same* attached PNG to hard-coded personal recipients. Nothing in the repository calls it, and the gateway has no route to it.

Two of the four classes are effectively empty (`KafkaListenerService` is 100 % commented out; the user query in `BirthdayListenerService` is commented out too). The event-driven notification design that the class names imply was abandoned mid-implementation and never removed — `spring-kafka` is declared in **0 of the 9** `pom.xml` files in this repository.

---

## 1. Entry points

| Path | Purpose |
|---|---|
| `notification-service/src/main/java/pro/algotrade/notificationservice/NotificaServicetionApplication.java:9` | `@SpringBootApplication` (line 7) + `@EnableScheduling` (line 8). Only `main()` in the module. **Class name is a typo** — `NotificaServicetion` for `Notification` — and the class is referenced nowhere else, so a rename is module-local. |
| `notification-service/src/main/resources/bootstrap.yml:1-3` | The **only** configuration file in the module: `spring.application.name=notification-service` (line 2) and `spring.config.import=optional:configserver:${CONFIG_SERVER:http://localhost:8888/}` (line 3). **There is no `application.yml` or `application.properties`** — 100 % of runtime config is fetched from `config-service`. |
| `notification-service/src/main/java/pro/algotrade/notificationservice/listener/BirthdayListenerService.java:16-17` | `@Scheduled(fixedDelay = DateUtils.MILLIS_PER_DAY) public void process()`. No `@Bean` and no `@Configuration` class exists anywhere in the module — everything is auto-configuration plus component scanning. |

No `@Configuration`, `@ConfigurationProperties`, `@Bean`, `@ControllerAdvice`, `WebMvcConfigurer`, `Filter` or `SecurityFilterChain` type exists in the module.

## 2. Folder structure

```
notification-service/                                  12 files total
├── pom.xml                                        (107 lines)
├── notification-service.iml                        (6 lines — SonarLint uniqueId only, lines 3-5)
├── mvnw / mvnw.cmd                                 (Maven wrapper launchers, not opened)
├── .mvn/wrapper/
│   ├── maven-wrapper.properties → Maven 3.8.6, wrapper 3.1.0
│   └── maven-wrapper.jar                           (binary, not opened)
└── src/main/
    ├── java/pro/algotrade/notificationservice/
    │   ├── NotificaServicetionApplication.java     (15 lines)         → 1 file
    │   ├── service/                                MailService.java   (62 lines)  → 1 file
    │   └── listener/                               KafkaListenerService.java (25 lines)  → 2 files
    │                                   BirthdayListenerService.java (33 lines)
    └── resources/
        ├── bootstrap.yml                           (3 lines)
        └── static/image/imageQRCode.png            (binary; attached to every mail)
```

| Package | Files |
|---|---|
| `pro.algotrade.notificationservice` | 1 |
| `pro.algotrade.notificationservice.service` | 1 |
| `pro.algotrade.notificationservice.listener` | 2 |
| **Java total** | **4 files / 3 packages / 135 lines** |

Absent: `src/test` (**the directory does not exist**), `Dockerfile` (only `person-service` and `user-service` are containerised), `README`, `.gitignore`, `application.yml`.

## 3. Architecture

**Classification: scheduler-driven single-purpose mailer.** Not the `controller → service → repository` shape; the real chain is

```
@EnableScheduling (NotificaServicetionApplication.java:8)
  → BirthdayListenerService.process()            @Scheduled fixedDelay = 1 day   (:16-17)
    → MailService.sendEmailWithAttachment()                                       (:31)
      → JavaMailSender.createMimeMessage() + MimeMessageHelper(multipart)         (:33,:37)
        → javaMailSender.send(msg)  →  SMTP smtp.gmail.com:587 STARTTLS            (:60)
```

Evidence:

- **0** `@RestController` / `@Controller` / `@RequestMapping` / `@GetMapping` / `@PostMapping` in the module. A regex sweep over `notification-service/` for those annotations plus `Entity|Repository|DataSource|javax.persistence|jpa|@Async|Retryable|RateLimit|@Transactional|@KafkaListener|@Bean|@Configuration|@ConfigurationProperties|@FeignClient` returned **2 matches, both inside commented-out code** (`BirthdayListenerService.java:27`, `KafkaListenerService.java:15`).
- `spring-boot-starter-web` (`pom.xml:40-43`) has **no application-level consumer**; it is on the classpath so the embedded container can serve Actuator and the Spring Boot Admin client.
- Two of four classes are inert: `KafkaListenerService.java` has **zero active statements** (its whole body, lines 15-23, is commented).
- No state layer of any kind (see §12).

## 4. Dependencies — declared vs actually imported

All coordinates below were verified by exact-text grep of `notification-service/pom.xml`; spellings are canonical, and version numbers come from the parent's `<properties>` via the `spring-cloud-dependencies` BOM imported at `pom.xml:68-78`.

| Dependency (pom line) | Imported in code? | Evidence |
|---|---|---|
| `spring-boot-admin-starter-client` 2.7.7 (`:18-22`) | **No** — auto-config only | target URL from `config-service/…/notification-service.yml:23` |
| `spring-cloud-starter-bootstrap` (`:24-27`) | **No** | it is what makes `bootstrap.yml` load at all (bootstrap context is off by default in Spring Cloud 2020+), yet `bootstrap.yml:3` simultaneously uses the Boot 2.4+ `spring.config.import` mechanism — both config-import generations in play at once |
| `spring-cloud-starter-config` (`:29-32`) | **No** | used via `bootstrap.yml:3` `optional:configserver:…` |
| `commons-lang3` — **scope `provided`** (`:34-38`) | **Yes** | `BirthdayListenerService.java:5` import → used at `:16` (`DateUtils.MILLIS_PER_DAY`). Scope anomaly: see §5 |
| `spring-boot-starter-web` (`:40-43`) | **No** | no controller/servlet/filter class exists |
| `spring-boot-starter-mail` (`:45-48`) | **Yes** | `MailService.java:5-7` (`SimpleMailMessage`, `JavaMailSender`, `MimeMessageHelper`) + `:10-12` (`javax.mail.*`). **Only pom in the repository that declares it** |
| `spring-cloud-starter-consul-discovery` (`:50-53`) | **No** | auto-registration only |
| `lombok` (`:55-59`, provided) | **Yes** | `@RequiredArgsConstructor` (`MailService.java:15`, `BirthdayListenerService.java:12`), `@Slf4j` (`KafkaListenerService.java:12`, `BirthdayListenerService.java:11`). No `@Data`/`@Getter`/`@Builder` anywhere — consistent with having no DTOs |
| `spring-boot-starter-test` (`:61-65`, test) | **Declared, never used** | `src/test` does not exist |

**Not declared** (absence is the finding): `spring-boot-starter-data-jpa`, `mysql-connector-java`, `spring-boot-starter-security`, `spring-kafka`, `spring-cloud-starter-openfeign`, `spring-boot-starter-actuator` (reached transitively via the Admin client), MapStruct, `spring-boot-starter-validation`, `spring-retry`, `spring-boot-starter-cache`.

## 5. Code quality

- **Tests: not found.** `src/test/` does not exist; 0 test classes for 4 classes → 0 % effective coverage, despite `spring-boot-starter-test` being declared (`pom.xml:61-65`).
- **Lint/format: not found in-module.** No Checkstyle / PMD / SpotBugs / spring-javaformat / `.editorconfig` under `notification-service/`. `notification-service.iml:3-5` carries nothing but a SonarLint `uniqueId`, and `.idea/sonarlint/issuestore/index.pb` hashes 4 of this module's files (3 Java sources + `pom.xml`) — analysis is **IDE-local only**.
- **Build enforcement: none.** `pom.xml:80-95` configures only `spring-boot-maven-plugin` (with the Lombok repackage exclusion). No Surefire/Failsafe/Jacoco configuration → nothing gates a merge.
- **CI: not found** — no `.github/`, no `.gitlab-ci.yml`, no `Jenkinsfile` anywhere in the repo.
- **Naming / latent-defect list**
  1. `NotificaServicetionApplication` — typo, `NotificaServicetionApplication.java:9`.
  2. **`commons-lang3` is `provided` (`pom.xml:37`) but is used at `BirthdayListenerService.java:16`.** It works only because `DateUtils.MILLIS_PER_DAY` is a `static final` inlined at compile time. The first non-constant commons-lang3 call added here produces a runtime `NoClassDefFoundError`.
  3. Dead method: `MailService.sendEmail()` (`:20-29`) has **zero callers**.
  4. `KafkaListenerService` is an empty `@Service` whose name promises a Kafka consumer.

## 6. Code patterns (mail composition & delivery)

| Concern | Finding |
|---|---|
| **Composition style** | Two styles coexist. `sendEmail()` (`:20-29`) uses `SimpleMailMessage` (`:22`) — text/plain, `send` at `:28`. `sendEmailWithAttachment()` (`:31-61`) uses `javaMailSender.createMimeMessage()` (`:33`) + `new MimeMessageHelper(msg, true)` multipart (`:37`), `helper.setText(html, true)` (`:49`), `helper.addAttachment("qr-code.png", new ClassPathResource("/static/image/imageQRCode.png"))` (`:55`). **Only the MimeMessage path is ever called** (`BirthdayListenerService.java:31`). |
| **Templates** | **None.** The HTML body is a string literal (`:49`) and the subject/body are literals (`:25-26`, `:45`). No Thymeleaf/Freemarker/Mustache dependency; no template file under `src/main/resources`. |
| **Recipients** | **Hard-coded.** `msg.setTo(<two personal addresses>)` at `:23`; `new InternetAddress(<personal address>)` at `:39`, with the second address and the `InternetAddress[]` array commented out at `:40` and `:42`. Values are not reproduced here (PII in a public remote). Neither method takes any parameter, so recipients are not configurable without a code change. No `spring.mail.from` is set either, so the `From` header is whatever `smtp.gmail.com` stamps. |
| **Sync vs async** | **Synchronous on the single scheduler thread.** No `@Async`, no `TaskScheduler`/`Executor` bean, no `CompletableFuture`, no `@EnableAsync`. `@Scheduled(fixedDelay = …)` (not `cron`), so the 24 h clock restarts *after* completion. |
| **Error handling** | **Partial and lossy.** The only `try/catch` (`:56-58`) wraps **message assembly**, not the send: `catch (MessagingException e) { throw new RuntimeException(e); }`, and `javaMailSender.send(msg)` sits **outside** the try at `:61`. `sendEmail()` has no `try` at all. A `MailException` / `AuthenticationException` / `SMTPSendException` propagates to the Spring scheduler, which logs and waits for the next window — **the notification is silently lost**. |
| **Retry** | **None.** No `@Retryable`, no `RetryTemplate`, no `spring-retry` dependency, no error channel, no dead-letter, no fallback address, no idempotency key. |
| **Timeouts** | `spring.mail.properties.mail.smtp.{connectiontimeout,timeout,writetimeout}` are **commented out** (`notification-service.yml:47-49`), as is `starttls.required` (`:53`), so `send()` can block on the JavaMail default read timeout and stall the only worker. |
| **DI style** | Uniform constructor injection via Lombok `@RequiredArgsConstructor` + `private final` (`MailService.java:15,18`; `BirthdayListenerService.java:12,15`). No field `@Autowired`. |
| **Commented-out code as architecture** | `KafkaListenerService.java:4-8,15-23` (the whole `Consumer<KStream<Object,String>>` bean); `BirthdayListenerService.java:19-29` (a `RestTemplate` call to `http://localhost:8087/internal/users`, copied from a Habr article, with the source URL left in a comment at `:19`); `user-service/…/MailServiceImpl.java:4,11-16` (the mirrored producer side). |

## 7. API-spec discovery

**Not found.** No `springdoc-openapi`, no `swagger-annotations`, no Spring Cloud Contract, no OpenAPI/Swagger `.yaml`/`.json`, no `@ApiResponse`/`@Operation` annotations. The module has exactly one resource file (`bootstrap.yml`).

## 8. Business modules

| Module | Path | Purpose |
|---|---|---|
| **Scheduled birthday/notification mailer** | `…/notificationservice/listener` (2 files) | Time-based trigger layer. Runs once per `fixedDelay` day and delegates to the mail module. Named "birthday" but performs **no** birthday query — the user query is commented out at `BirthdayListenerService.java:19-29`, so today it sends one generic email regardless of any user. |
| **SMTP mail delivery (JavaMailSender transport)** | `…/notificationservice/service` (1 file) | The component's only real capability. Two composition styles implemented; only the multipart variant is reachable. |
| **Bootstrap, config import and scheduling enablement** | `…/notificationservice/NotificaServicetionApplication.java` | `SpringApplication.run` + `@EnableScheduling` (`:8`) — without line 8 the `@Scheduled` job never fires. Sources all config from `config-service` (`bootstrap.yml:3`). |

## 9. Entities — none, and that is a finding, not a gap in this scan

**`entities: []`** with evidence, per the brief's instruction not to invent one:

- No JPA `@Entity`, no DTO, no `record`, no `enum`, no `@ConfigurationProperties`-bound type, no custom exception, no interface. All 4 files are accounted for in §2 and none declares a type with fields.
- Both send methods are `void` with **zero parameters** (`MailService.java:20`, `:31`) — there is no request or response contract to model, so no DTO surface exists.
- Consequence for Phase 6: this component contributes **nothing** to an `api` domain skill, and `index.json → coverage.api` must not be flipped to true on its account.

## 10. Endpoint groups

**Count: 0 groups, 0 endpoints.** No `@RestController`/`@Controller`/`@RequestMapping` exists (verified by regex sweep; only 2 matches, both commented).

Framework-provided HTTP surface, for completeness (not application endpoints):

| Path | Methods | Auth | Source of exposure |
|---|---|---|---|
| `/actuator/**` | GET | **none** — no Spring Security on the classpath | `config-service/…/notification-service.yml:14-17`: `management.endpoints.web.exposure.include: "*"`, `health.show-details: always` |
| `/image/imageQRCode.png` | GET | **none** | sits in the default static location `src/main/resources/static/image/`; `spring-boot-starter-web` present (`pom.xml:40-43`), no security filter, no resource-handler customization |

Both are reachable only on a **random port** (`server.port: 0`, `notification-service.yml:1-2`) that the gateway never routes to.

## 11. Named integrations

| Integration | Package | Used in | Notes / compliance |
|---|---|---|---|
| **Gmail SMTP relay** — `spring.mail.host=smtp.gmail.com`, `port 587`, `smtp.auth=true`, `starttls.enable=true` | `spring-boot-starter-mail` → `javax.mail` (JavaMail/`com.sun.mail`) `JavaMailSenderImpl`; `javax.*` confirmed by `MailService.java:10-12` | `MailService.java:18,28,60`; properties `config-service/…/notification-service.yml:36-56` | **P0:** `notification-service.yml:39-40 — spring.mail.username and spring.mail.password are plaintext literals`. No `${ENV}` placeholder, no Vault/Consul-Secrets indirection, committed to a repo whose remote is public GitHub. **Values are deliberately not reproduced in this report in any form, including masked or truncated.** Secondary: a consumer-provider app password — delivery breaks if Google revokes legacy app passwords; no fallback host exists. |
| **HashiCorp Consul** registry `localhost:8500` | `spring-cloud-starter-consul-discovery` | `pom.xml:50-53`; `notification-service.yml:28-34` | `register-health-check: false` (`:33`) → a crashed mailer stays registered. With `server.port: 0` and zero inbound endpoints, registration advertises a service nobody calls. |
| **Spring Cloud Config Server** `http://localhost:8888/` (env `CONFIG_SERVER`) | `spring-cloud-starter-config` + `spring-cloud-starter-bootstrap` | `bootstrap.yml:3`; `pom.xml:24-32` | Supplies **all** runtime config. `optional:` prefix ⇒ if config-service is down the service still starts and `JavaMailSender` stays on Boot defaults (`localhost:25`, no auth) — a silently mis-wired mailer, not a start-up failure. No fail-fast. |
| **Spring Boot Admin Server** `http://localhost:5555/` (env `ADMIN_SERVER`) | `de.codecentric:spring-boot-admin-starter-client` 2.7.7 | `pom.xml:18-22`; `notification-service.yml:19-23` | Also the only reason Actuator is on the classpath. With `include:"*"` + `show-details:always` and no security, treat the random port as a full-info surface. |
| **Apache Kafka (Streams)** — **ABSENT** | none; `spring-kafka`/`kafka-streams` in **0 of 9** poms | `KafkaListenerService.java:4-6,15-23` (commented); `user-service/…/MailServiceImpl.java:4,11-16` (commented) | The intended path (topic `"mails"`, payload `"<action>: <content>"`) exists only as commented code on both ends. **Do not describe the platform as event-driven** on the strength of the class name. Reintroducing Kafka requires the dependency-approval gate. |

## 12. Persistence layer — **none, stateless** (confirmed)

1. `notification-service/pom.xml:16-67` read in full: 8 compile-scope dependencies + 1 test dependency; `spring-boot-starter-data-jpa` is **not** among them.
2. No JDBC driver — `mysql-connector-java` absent; no H2/Postgres, no HikariCP override.
3. Regex sweep for `Entity|Repository|DataSource|javax.persistence|jpa|@Transactional` → 0 active matches.
4. No `application.yml` locally, and `config-service/…/notification-service.yml` defines **no `spring.datasource.*`** either.
5. No cache dependency either (no `spring-boot-starter-cache`, no Redis) ⇒ **the component holds no state between runs — which is exactly why the missing dedupe guard (§"answer c") cannot be implemented in-process today.**
6. **Contradiction worth noting:** `notification-service.yml:10-12` sets `logging.level.org.hibernate.SQL=debug` / `type.descriptor.sql=trace` for a service with **no Hibernate on its classpath** — a copy-paste leftover that will mislead the next reader.

## 13. Explicit answers (file:line)

**(a) Which endpoints can trigger an email? Authenticated at service level?**
**None.** There are no endpoints at all (§10), so nothing is authenticated and nothing is un-authenticated either. The only path that sends mail is the scheduler: `BirthdayListenerService.java:16-17` → `:31` → `MailService.java:60`. Service-level authentication **does not exist**: `spring-boot-starter-security` and `spring-security-oauth2-resource-server` are absent from `notification-service/pom.xml:16-67`. Therefore the only HTTP that does answer — `/actuator/**` (`notification-service.yml:14-17`, exposed `"*"`) and `/image/imageQRCode.png` — is **unauthenticated at the service level**. Its only real protection is accidental: `server.port: 0` gives no stable port and `config-service/…/gateway-service.yml:38-51` declares no route for this service.

**(b) `spring.mail.*` property NAMES (values withheld)** — `config-service/src/main/resources/config/notification-service.yml`, block `spring.mail` at **lines 36-56**:
`spring.mail.host` (**37**, hostname `smtp.gmail.com` — a hostname, cited as such, not a credential) · `spring.mail.port` (**38**, 587) · `spring.mail.username` (**39**) · `spring.mail.password` (**40**) · `spring.mail.properties.mail.smtp.auth` (**46**) · `spring.mail.properties.mail.smtp.starttls.enable` (**51-52**).
**Literals vs placeholders:** lines **39-40 are plaintext literals** — `config-service/src/main/resources/config/notification-service.yml:39-40 — spring.mail.username and spring.mail.password are plaintext literals`; no `${…}` indirection, no default, no secret-store reference. Their values are not reproduced here in any form. Contrast with the *same file's* genuinely externalised values (`CONFIG_SERVER`-style env overrides at `:23`, and `bootstrap.yml:3`), so the pattern exists and simply was not applied here.
**Absent:** any `mail.enabled`-style flag (**no kill switch** — mail cannot be stopped without a code change), `spring.mail.default-encoding`, `spring.mail.protocol`, `spring.mail.from`/`from-address`; **commented out**: `smtp.connectiontimeout|timeout|writetimeout` (47-49), `starttls.required` (53), `socketFactory.*` for SSL/465 (55-56).

**(c) Rate limit or dedupe on sending?** **None.** No `RateLimit`/`@Async`/`@Retryable`/`RetryTemplate`/`spring-retry`/cache dependency in `pom.xml`, and no in-memory or persisted "already sent" marker. The sole throttle is `@Scheduled(fixedDelay = DateUtils.MILLIS_PER_DAY)` at `BirthdayListenerService.java:16` — a **delay**, not a rate limit and not an idempotency guard, so a restart before the delay elapses re-sends the same mail to the same recipients (`MailService.java:23` → 2 addresses, `:39` → 1 address), with no configurable burst target.

**(d) Does any other service call this one, and with what client?** **No — not one.** Outside the module, `notification-service` appears only in build/IDE metadata (`pom.xml:46`; `.idea/misc.xml:13`; `.idea/compiler.xml:12,79`; `.idea/encodings.xml:13`) and in its own config-service YAML. No Feign client, no `RestTemplate`, no `WebClient`, no `DiscoveryClient` lookup targets it; `gateway-service.yml:38-51` routes only to `auth-service`, `user-service`, `person-service`; there is no Kafka topic linking anything (`spring-kafka` in 0 poms). The would-be caller, **`user-service`, owns its own disabled pair instead** — `user-service/src/main/java/pro/algotrade/userservice/service/NotificationService.java:3` and `…/service/impl/MailServiceImpl.java:10-17`, whose `KafkaTemplate` body is commented out. So the platform's notification story is: *two disabled implementations, zero connections between them.*

## 14. Cross-component dependencies (recorded, not followed)

| Target | Via |
|---|---|
| `config-service/src/main/resources/config/notification-service.yml` | Spring Cloud Config at boot — the module's entire runtime config lives outside its directory. Opened read-only **only** because the brief required the `spring.mail.*` names. |
| `pom.xml` (root) | Maven parent `pro.algotrade:algo-trade-platform:1.0` (`:5-9`) + `<module>notification-service</module>` (`:46`). |
| `user-service/…/service/impl/MailServiceImpl.java` | **No runtime dependency in either direction** — a parallel, also-disabled notification implementation. Recorded because it explains the absence of inbound callers. |
| `config-service/…/config/gateway-service.yml:38-51` | **Not** a dependency — the gateway has no route to this service, so it is unreachable from the edge. |

## 15. Gaps / what could not be determined

1. **`entities: []` and `endpointGroups: []` are verified findings, not shallow scanning** — see §9/§10 for the evidence. `validate-analysis.js` will flag this backend as "shallow" on those two counts; the correct response is **not** a narrowed follow-up dispatch, because there is nothing there to find.
2. **Runtime behaviour unverified** — no build, no run (read-only analysis), so whether Gmail delivery currently succeeds and whether the daily email has actually been firing is unknown.
3. **Intended business semantics unrecoverable** — the recipient query is commented out (`BirthdayListenerService.java:19-29`), so birthday-only vs general fan-out cannot be determined statically.
4. **Binaries/launchers not opened:** `.mvn/wrapper/maven-wrapper.jar`, `src/main/resources/static/image/imageQRCode.png`, `mvnw`, `mvnw.cmd`. The QR image's content is therefore unverified — only that it is attached to every outgoing mail (`MailService.java:55`) and sits under a publicly-served path.
5. **Actuator on the classpath is an inference** from `spring-boot-admin-starter-client`; no pom declares `spring-boot-starter-actuator` directly, and a dependency tree could not be produced (no Maven invocation permitted in this analysis).
6. **Documentation conflict for the orchestrator:** `.opencode/rules/development.md` states *"No Maven wrapper is committed — use a local `mvn`"*, yet this module ships `mvnw`, `mvnw.cmd` and `.mvn/wrapper/maven-wrapper.properties` (Maven 3.8.6). Either the rule is stale or the wrapper is module-local; this report changes neither.

## 16. Recommendations

1. **Credentials (P0, already tracked in `.opencode/project_init.md`):** replace the two literals at `notification-service.yml:39-40` with `${SMTP_USERNAME}`/`${SMTP_PASSWORD}`, rotate, purge history. While that file is open, **add a `mail.enabled`-style flag** — today outbound mail cannot be stopped without deleting code.
2. **Move the hard-coded recipients** (`MailService.java:23`, `:39`) into a list property. They are personal addresses in a public remote repo (PII) and make it impossible to point the service at a test mailbox. No new dependency required.
3. **Guard and bound the send:** wrap `javaMailSender.send()` (`:28`, `:61`) with real handling + logging, and uncomment `smtp.{connectiontimeout,timeout,writetimeout}` (`notification-service.yml:47-49`) — one unbounded SMTP read timeout stalls the only scheduler thread.
4. **Decide Kafka explicitly:** delete `KafkaListenerService.java` and the mirrored `user-service` `NotificationService`/`MailServiceImpl`, **or** wire `spring-kafka` on both ends. Leaving them is the worst option: the class names actively mislead architecture documentation. Reintroducing Kafka needs the dependency-approval gate.
5. **Delete or wire `sendEmail()`** (`:20-29`, zero callers); either drop `spring-boot-starter-test` or add the first test — `MailService` is trivially testable with a mocked `JavaMailSender`, no new dependency.
6. **Small hardening:** fix `NotificaServicetionApplication` (`:9`, safe rename) and either scope `commons-lang3` to `compile` (`pom.xml:37`) or inline the 86 400 000 ms constant, so the build stops depending on a constant-inlining accident.
7. **Classify honestly in generated docs:** notification-service is a scheduled background job packaged as a web application — no controllers, no gateway route, no stable port — and must not be presented as part of the platform's REST surface.

---

*Report produced by the `codebase-analyzer` subagent for initialization Phase 4. Companion machine-readable artifact: `notification-service.json`. SMTP credential values were never reproduced in either artifact.*
