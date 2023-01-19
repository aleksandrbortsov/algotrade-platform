package pro.algotrade.userservice.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import pro.algotrade.userservice.controller.dto.PersonDto;
import pro.algotrade.userservice.controller.dto.UserRequest;
import pro.algotrade.userservice.controller.dto.UserResponse;
import pro.algotrade.userservice.exception.PersonEntityNotFoundRuntimeException;
import pro.algotrade.userservice.exception.UserServiceGlobalRuntimeException;
import pro.algotrade.userservice.exception.config.GlobalErrorCode;
import pro.algotrade.userservice.mapper.UserMapper;
import pro.algotrade.userservice.service.UserService;

@RestController
@RequestMapping("/users")
@Slf4j
@RequiredArgsConstructor
public class UserController {
    public static final String API_GATEWAY_URL = "http://localhost:3535";
    public static final String API_PERSONS_URL = "/persons/";
    private final UserService service;
    private final RestTemplate restTemplate;

    @PostMapping
    public ResponseEntity<UserResponse> create(@RequestBody UserRequest dto) {
        log.info("User create: {}", dto);

        var person = getPersonDto(dto.getPersonId());
        dto.setPersonId(person.getId());

        var entity = UserMapper.INSTANCE.dtoToEntity(dto);
        var createdEntity = service.create(entity);

        var createdDto = UserMapper.INSTANCE.entityToDto(createdEntity);
        createdDto.setPerson(person);


        return ResponseEntity.ok(createdDto);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        var entity = service.getById(id);
//todo during user registration to generate QR-code by [Secret] Entity field (and QR page),
// then implement 2MFA with Authenticator (or Google ) Android App
//        Totp totp = new Totp(entity.getSecret());
//        try {
//            if (!totp.verify("verificationCode")) {
//                throw new UserServiceGlobalRuntimeException("Invalid verification code", 9889L);
//            }
//        } catch (Exception e) {
//            throw new UserServiceGlobalRuntimeException("Invalid verification code", 9889L);
//        }

        var dto = UserMapper.INSTANCE.entityToDto(entity);

        var person = getPersonDto(entity.getPersonId());
        dto.setPerson(person);

        log.info("User get {}", dto);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserResponse> getByUsername(@PathVariable String username) {
        var entity = service.getByUsername(username);

        var dto = UserMapper.INSTANCE.entityToDto(entity);

        log.info("User get {}", dto);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable Long id,
                                               @RequestBody UserRequest dto) {
        var entity = service.update(id, dto);
        var updatedDto = UserMapper.INSTANCE.entityToDto(entity);

        var person = getPersonDto(entity.getPersonId());
        updatedDto.setPerson(person);

        log.info("User with ID {} updated to {}", id, updatedDto);
        return ResponseEntity.ok(updatedDto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        if (Boolean.TRUE.equals(service.delete(id))) {
            log.info("User with ID delete {}", id);
        }
        return ResponseEntity.ok("User was deleted");
    }

    private PersonDto getPersonDto(Long personId) {
        PersonDto person;
        try {
            person = restTemplate.getForObject(API_GATEWAY_URL + API_PERSONS_URL + personId, PersonDto.class);
        } catch (HttpClientErrorException e) {
            throw new UserServiceGlobalRuntimeException("Error during Person Service request: " +
                    e.getLocalizedMessage(), GlobalErrorCode.INTERNAL_ERROR);
        }

        if (person == null) {
            throw new PersonEntityNotFoundRuntimeException();
        }
        log.info("Person from person-service: {}", person);
        return person;
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody UserRequest userDto) {
        String login = userDto.getLogin();
        byte[] bytes = toString().getBytes();
        return null;
    }
}
