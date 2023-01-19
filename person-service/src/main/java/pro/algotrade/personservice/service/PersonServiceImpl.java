package pro.algotrade.personservice.service;


import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import pro.algotrade.personservice.controller.dto.PersonRequest;
import pro.algotrade.personservice.persistence.PersonEntity;
import pro.algotrade.personservice.exception.PersonEntityNotFoundRuntimeException;
import pro.algotrade.personservice.persistence.repository.PersonRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonServiceImpl implements PersonService {
    private final PersonRepository personRepository;

    public PersonEntity create(PersonEntity personEntity) {
        personEntity.setUuid(UUID.randomUUID().toString());

        return personRepository.save(personEntity);
    }

    @Override
    public Boolean delete(Long id) {
        PersonEntity personEntity = personRepository.findById(id).orElseThrow(PersonEntityNotFoundRuntimeException::new);
        personRepository.delete(personEntity);
        return true;
    }

    @Override
    public PersonEntity update(Long id, PersonRequest personRequest) {
        var personEntity = getById(id);
        BeanUtils.copyProperties(personRequest, personEntity, "id", "uuid");
        personRepository.save(personEntity);
        return personEntity;
    }

    @Override
    public PersonEntity getById(Long id) {
        return personRepository.findById(id).orElseThrow(PersonEntityNotFoundRuntimeException::new);
    }
}
