package pro.algotrade.personservice.mapper;

import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;
import pro.algotrade.personservice.controller.dto.PersonRequest;
import pro.algotrade.personservice.controller.dto.PersonResponse;
import pro.algotrade.personservice.persistence.PersonEntity;

@Mapper
public interface PersonMapper {

    PersonMapper INSTANCE = Mappers.getMapper(PersonMapper.class);

    @Mapping(target = "uuid", ignore = true)
    PersonEntity dtoToEntity(PersonRequest personRequest);

    @InheritInverseConfiguration
    PersonResponse entityToDto(PersonEntity personEntity);
}
