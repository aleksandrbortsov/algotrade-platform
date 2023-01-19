package pro.algotrade.personservice.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.algotrade.personservice.controller.dto.PersonResponse;
import pro.algotrade.personservice.mapper.PersonMapper;
import pro.algotrade.personservice.controller.dto.PersonRequest;
import pro.algotrade.personservice.service.PersonService;


@RestController
@RequestMapping("/persons")
@Slf4j
@RequiredArgsConstructor
public class PersonController {
    private final PersonService personService;

    @PostMapping
    public ResponseEntity<PersonResponse> create(@RequestBody PersonRequest personRequest) {
        log.info("Person create {}", personRequest);
        var personEntity = PersonMapper.INSTANCE.dtoToEntity(personRequest);
        var createdPersonEntity = personService.create(personEntity);

        return ResponseEntity.ok(PersonMapper.INSTANCE.entityToDto(createdPersonEntity));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PersonResponse> getById(@PathVariable Long id) {
        var personEntity = personService.getById(id);
        var personDto = PersonMapper.INSTANCE.entityToDto(personEntity);
        log.info("Person get {}", personDto);
        return ResponseEntity.ok(personDto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PersonResponse> update(@PathVariable Long id,
                                                @RequestBody PersonRequest personRequest) {
        var personEntity = personService.update(id, personRequest);
        var updatedPersonDto = PersonMapper.INSTANCE.entityToDto(personEntity);
        log.info("Person with ID = {} update to {}", id, updatedPersonDto);
        return ResponseEntity.ok(updatedPersonDto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> delete(@PathVariable Long id) {
        var deleted = personService.delete(id);
        log.info("Person with ID = {} delete ", id);
        return ResponseEntity.ok(deleted);
    }
}
