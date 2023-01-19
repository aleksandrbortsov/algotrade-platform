package pro.algotrade.personservice.service;

import pro.algotrade.personservice.persistence.PersonEntity;
import pro.algotrade.personservice.controller.dto.PersonRequest;


public interface PersonService {
    PersonEntity create(PersonEntity personEntity);

    PersonEntity getById(Long id);

    Boolean delete(Long id);

    PersonEntity update(Long id, PersonRequest personRequest);
}
