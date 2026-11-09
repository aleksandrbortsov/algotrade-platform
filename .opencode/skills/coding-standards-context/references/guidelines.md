# Coding Standards

> **Component Rule:** This file contains language-specific coding standards for Java 17 / Spring Boot 2.7.5.
>
> **Related:** See [development.md](../../../rules/development.md) for high-level architecture overview.
> See [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) for mandatory code reuse checks.

---

## Core Principles

1. **NEW code:** Follow Spring Boot 2.7, Spring Cloud 2021.0.5 and Java 17 conventions without introducing Spring Boot 3 or `jakarta.*` syntax.
2. **EXISTING code:** Match the module's existing controller, service, mapper, repository and exception patterns.
3. **Documentation:** Use Javadoc for public contracts and non-obvious behavior. There is currently no OpenAPI contract, so do not add Swagger or SpringDoc dependencies without approval.
4. **Code style:** Keep style consistent within each Maven module. No formatter, Checkstyle, PMD or Sonar rule is enforced by the Maven build.

---

## Language & Framework

- **Language:** Java 17 parent target across a multi-module Maven reactor
- **Framework:** Spring Boot microservices with Spring Cloud 2021.0.5
- **Version:** Spring Boot 2.7.5, Spring Cloud 2021.0.5, Lombok 1.18.24, MapStruct 1.5.3.Final

Several module POMs still pin compiler source and target to Java 10. New work in those modules should remove the module-level pin and inherit the parent Java 17 configuration when compatible. Do not add another module-level version pin.

---

## Dependency Management Patterns

### Preferred Pattern for New Code

Use constructor injection through Lombok `@RequiredArgsConstructor` and `final` dependencies. This is the dominant production pattern.

```java
@Service
@RequiredArgsConstructor
public class PersonServiceImpl implements PersonService {
    private final PersonRepository personRepository;
}
```

Use these established libraries before proposing alternatives:

- Lombok for constructor and logger boilerplate
- MapStruct for DTO/entity mapping
- Spring Data JPA where persistence is active
- `RestTemplate` for synchronous service-to-service calls from servlet services
- Reactive `WebClient` only in reactive gateway code, following the existing `AuthFilter` pattern
- Lombok and MapStruct annotation processing as configured by the parent POM

Do not introduce OpenFeign, WebFlux outside the gateway, SpringDoc, bean validation, Flyway, Liquibase, Kafka or another client pattern without an explicit user decision.

### When Updating Existing Code

**Rule:** Match the existing pattern in the file — both dependency management AND documentation style.

1. Read the entire file before making changes
2. Identify the current dependency management approach
3. Add new dependencies following the same pattern
4. Do NOT mix patterns within a single file

`user-service` and `person-service` currently call MapStruct through `Mappers.getMapper()` static singletons at the controller boundary. Preserve that pattern in existing classes. For a new module, constructor-injected MapStruct implementation beans are acceptable only when the module is being deliberately modernized and the change is called out.

---

## Documentation & Comment Patterns

### Per-Layer Documentation Rules

- **Application class:** Brief Javadoc only when the module purpose is not obvious from its name and configuration.
- **Controller:** Document the operation and expected business outcome. Controller signatures are the current de-facto API contract because no OpenAPI document exists.
- **Service interface and implementation:** Document business rules, state transitions and external calls. Explain why a rule exists, especially around the unresolved authentication and Person/User boundaries.
- **Mapper:** Document field transformations and ignored properties when annotations are not self-explanatory.
- **Repository:** Document non-trivial queries. Derived Spring Data method names can remain undocumented.
- **Entity:** Document business meaning and sensitive fields. Do not expose secret or personal-data fields through response DTOs by default.
- **ExceptionHandler:** Document status behavior and any message-key contract.
- **Configuration bean:** Document security and environment consequences. Be explicit when a setting is a known defect, such as `permitAll()` or wildcard actuator exposure.

### When to Document

| Element | Documentation Required | Notes |
|---------|----------------------|-------|
| **Public interfaces / exported types** | Always | All public members |
| **Public classes / modules** | Always | Purpose and usage |
| **Public methods / functions** | Always | Unless trivially named getter/setter |
| **Protected / internal methods** | Always | For subclass or module implementers |
| **Private methods** | Optional | Only if complex logic |
| **Override / inherited methods** | Conditional | Only if behavior differs from parent |
| **Constants / configuration** | Sometimes | If not self-explanatory |

### Documentation Best Practices

- **Document WHY, not WHAT** — explain reasoning, not mechanics
- **Use structured format** — consistent doc comments across the project
- **Reference related code** — link to related classes, interfaces, or modules
- **Keep descriptions actionable** — state what the method does, not how it is called
- **Document risk explicitly** — note when a method logs PII, stores a plaintext secret, trusts an unverified identifier or returns a placeholder token.

---

## Naming Conventions

### General Patterns

- Base packages use `pro.algotrade.<service>`, for example `pro.algotrade.personservice`.
- Maven modules use kebab-case names ending in `-service`.
- Classes use PascalCase.
- Methods, fields and local variables use camelCase.
- Constants use `UPPER_SNAKE_CASE`.
- REST resources are currently unversioned plural paths such as `/persons` and `/users`.

### Layer-Specific Naming

Use these suffixes where they match the module:

| Layer | Naming |
|---|---|
| Controller | `*Controller` |
| Service contract | `*Service` |
| Service implementation | `*ServiceImpl`, or `*ServiceImpl` directly in a `service` package when the module already uses that shorter layout |
| Persistence entity | `*Entity` |
| Repository | `*Repository` |
| MapStruct mapper | `*Mapper` |
| Request payload | `*Request` |
| Response payload | `*Response` |
| Business exception | `*RuntimeException` or `*Exception` |
| Global exception handler | `*GlobalExceptionHandler` |
| Test class | `*Tests.java` |

Use repository methods named after their lookup:

- `findById(Long id)`
- `findByUsername(String username)`
- `existsByUsername(String username)` when a more efficient existence check is needed

Do not add `/api/v1` to existing services without approval. Versioning the public path is an architectural change.

---

## Code Style Consistency

### Declaration Order

Follow this order for a new Spring service type:

1. Package and imports
2. Type annotations such as `@Service`, `@RestController` and `@RequiredArgsConstructor`
3. Type declaration
4. Static constants and constants such as `PersonMapper.INSTANCE`
5. Injected `final` dependencies
6. Other fields
7. Constructors, if not generated by Lombok
8. Public methods, ordered by business flow rather than alphabetically
9. Private helper methods
10. Inner types

Do not interleave public API methods with unrelated persistence or mapping helpers.

### Annotation / Decorator Order

Controller example:

```java
@RestController
@RequestMapping("/persons")
@Slf4j
@RequiredArgsConstructor
public class PersonController {
    private final PersonService personService;
}
```

Service example:

```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService, UserDetailsService {
    private final UserRepository repository;
}
```

Exception-handler example:

```java
@ControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class PersonGlobalExceptionHandler extends ResponseEntityExceptionHandler {
}
```

For DTO mapping, keep `@Mapping` and `@InheritInverseConfiguration` adjacent to the method they control so the transformation is visible with its signature.

---

## Error Handling

Use the established checked business-exception pattern in the owning service module.

1. Throw a module-specific runtime exception for a known business failure.
2. Carry an i18n message key and a numeric `GlobalErrorCode` through the module's `*ServiceGlobalRuntimeException` type when an error response is required.
3. Let the module's `@ControllerAdvice` handler translate the exception.
4. Return `ErrorResponse` with the code and localized message rather than an internal exception message.

Established example:

```java
throw new UserServiceGlobalRuntimeException(
    "error.qr_code.generation",
    GlobalErrorCode.ERROR_QR_CODE_GENERATION
);
```

Use specific not-found exceptions such as `PersonEntityNotFoundRuntimeException` and `UserEntityNotFoundRuntimeException` from repository lookup failures. Avoid broad `catch (Exception e)` blocks that convert every failure to HTTP 400. Existing handlers do this and should be treated as defects, not as templates for new code.

Do not log credentials, tokens, QR secret material, passwords or full personal-data objects in an exception message.

---

## Test-Driven Development (TDD) Policy

> **Universal trigger logic, RED-GREEN-REFACTOR discipline, and best practices live in the [Code Quality Standards skill](../../code-quality-standards/SKILL.md) → "Test-Driven Development (TDD)" section. This section captures project-specific TDD policy that overrides or specializes the universal defaults.**

### Policy Level

- **TDD policy:** recommended
- **Categories where TDD is mandatory (if policy = recommended/optional):** None configured as a hard project override

### Tooling

- **Primary test framework:** `spring-boot-starter-test` with JUnit 5, Mockito, AssertJ and MockMvc
- **E2E framework (if any):** Not configured
- **Coverage tool:** Not configured
- **Run command (single file):** `mvnw.cmd -Dtest=ClassName test` from the owning Maven module
- **Run command (full suite):** `mvn test` from the reactor root when a compatible Maven installation is available
- **Watch command:** Not configured

### Conventions

- **Test file naming:** `*Tests.java`
- **Test file location:** `<module>/src/test/java`, with the package matching the production class
- **Test name style:** Behavior-oriented JUnit 5 methods are recommended; no enforced convention currently exists
- **Mocking strategy:** Use Mockito unit tests for service rules, MockMvc for controller contracts, and test slices for repository or configuration work. Reserve full `@SpringBootTest` for cases that genuinely need the application context.

### Coverage Thresholds

- **Statements:** Not configured
- **Branches:** Not configured
- **Functions:** Not configured
- **Lines:** Not configured
- **Enforcement:** None

### Test Output

- **Reports directory:** `<module>/target/surefire-reports/`
- **CI integration:** None — no CI server or pipeline is configured

### TaskMaster Integration

- **Use TaskMaster for TDD subtasks:** Complex tasks only

### Project-Specific TDD Notes

Only two test classes were found. `ConfigServiceApplicationTests` requires a context and Consul dependency, while `HelloControllerTests` references code outside its current module. Neither should be assumed green. Add focused tests around the regression being fixed before making a behavioral change.

The two Dockerfiles do not establish an executable E2E environment because Consul, MySQL, SMTP behavior and service ports require manual setup.

---

## AI Agent Behavior

### Before Creating a New Class / Module

1. **Search for similar classes** in the same package or directory (see [Code Quality Standards Skill](../../code-quality-standards/SKILL.md))
2. **Read 2-3 similar files** to understand existing patterns:
   - Dependency management style
   - Documentation level and format
   - Method naming conventions
   - Comment density and style
3. **Match the dominant pattern** OR use best practices for greenfield code

Before creating another service, inspect the nearest module and current analysis artifact under `.opencode/project/analysis/`. Before editing API behavior, check `gateway-service.yml` because route ownership is in the configuration service, not the gateway module.

### Before Adding a Method to an Existing File

1. **Read the entire file** to understand:
   - Current dependency management pattern
   - Documentation style used
   - Existing method signatures and naming
2. **Check neighboring methods:**
   - Do they have doc comments?
   - What is the format?
   - How detailed are the descriptions?
3. **Match the existing style** — the new method should be indistinguishable from existing ones

### Documentation Decision Tree

```text
Is this an interface or public contract?
Yes
├── Document purpose, caller contract, failure behavior
└── Document every public member

No
├── Service or business logic
│   ├── Class Javadoc
│   └── Document non-obvious rules and external side effects
├── Controller
│   ├── Document operation and response semantics
│   └── Do not assume Swagger exists
├── Mapper
│   └── Document non-trivial or ignored mappings
└── Repository
    ├── Minimal for derived queries
    └── Explain custom or native queries
```

---

## Examples

### Constructor injection and business exception

`UserServiceImpl` demonstrates the dominant Lombok constructor-injection pattern and a typed business exception:

```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService, UserDetailsService {
    private final UserRepository repository;
    private final NotificationService mailService;
    private final PasswordEncoder bCryptPasswordEncoder;
    private final QrCodeGenerator qrCodeGenerator;

    @Override
    public UserEntity getByUsername(String username) {
        return repository.findByUsername(username)
            .orElseThrow(UserEntityNotFoundRuntimeException::new);
    }
}
```

Source: [UserServiceImpl.java](../../../../user-service/src/main/java/pro/algotrade/userservice/service/impl/UserServiceImpl.java).

### MapStruct singleton mapping

`PersonMapper` establishes the project's current MapStruct pattern. The UUID is assigned by the service and ignored during request mapping:

```java
@Mapper
public interface PersonMapper {
    PersonMapper INSTANCE = Mappers.getMapper(PersonMapper.class);

    @Mapping(target = "uuid", ignore = true)
    PersonEntity dtoToEntity(PersonRequest personRequest);

    @InheritInverseConfiguration
    PersonResponse entityToDto(PersonEntity personEntity);
}
```

Source: [PersonMapper.java](../../../../person-service/src/main/java/pro/algotrade/personservice/mapper/PersonMapper.java).

### Controller boundary

`PersonController` uses unversioned `/persons`, `ResponseEntity`, constructor injection and static mapping at the boundary:

```java
@GetMapping("/{id}")
public ResponseEntity<PersonResponse> getById(@PathVariable Long id) {
    var personEntity = personService.getById(id);
    var personDto = PersonMapper.INSTANCE.entityToDto(personEntity);
    return ResponseEntity.ok(personDto);
}
```

Source: [PersonController.java](../../../../person-service/src/main/java/pro/algotrade/personservice/controller/PersonController.java).

Do not copy the existing `log.info(..., personRequest)` and `log.info(..., personDto)` calls into new code. They log personal data at INFO level.

### Exception translation

`PersonGlobalExceptionHandler` translates a module exception and `MessageSource` key into an `ErrorResponse`:

```java
return ResponseEntity
    .badRequest()
    .body(ErrorResponse
        .builder()
        .code(e.getCode())
        .message(messageSource.getMessage(e.getMessage(), null, locale))
        .build());
```

Source: [PersonGlobalExceptionHandler.java](../../../../person-service/src/main/java/pro/algotrade/personservice/exception/config/PersonGlobalExceptionHandler.java).

The same handler also catches every `Exception` and returns HTTP 400. That broad fallback is a known defect and must not be copied.

---

## Maintaining This Document

> **Update Policy:** This document MUST be updated when any of the following occur:

1. New naming convention established or existing one changed → update Naming Conventions
2. Dependency injection or module pattern changed → update Dependency Management Patterns
3. Documentation convention updated → update Documentation & Comment Patterns
4. Declaration or annotation order rules changed → update Code Style Consistency
5. New error handling pattern introduced → update Error Handling section
6. New language, framework, or version adopted → update Language & Framework
7. New representative code examples available → update Examples section
8. Ask user to confirm documentation updates before finalizing

### When User Asks About Coding Standards

1. First check this document for the answer
2. If not found here, check existing code for the dominant pattern — then propose adding it to this document
3. Do NOT introduce inconsistent patterns — always resolve ambiguity by aligning with what's already established

---

## Related Rules

- [development.md](../../../rules/development.md) - Architecture overview
- [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) - Code reuse checks and universal TDD discipline
- Phase 4 analysis index: [analysis/index.json](../../../project/analysis/index.json)
- Backend, database, API and testing context skills were declined in Phase 6; their evidence remains in the Phase 4 analysis artifacts.

---

## Notes

- There is no enforced formatter, linter, CI pipeline, coverage threshold or API specification.
- The Maven build contains two test classes, so existing code — not automated quality — is the primary convention source.
- Authentication, gateway security, `account-service` purpose and the Person/User domain boundary remain open gaps and must not be silently redesigned by a coding task.
- Never copy committed credentials from `src/main/resources` into code, tests, examples or documentation.
