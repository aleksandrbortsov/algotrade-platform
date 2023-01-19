package pro.algotrade.personservice.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pro.algotrade.personservice.persistence.PersonEntity;

@Repository
public interface PersonRepository extends JpaRepository<PersonEntity, Long> {
}
