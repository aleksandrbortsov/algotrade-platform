package pro.algotrade.userservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;
import pro.algotrade.userservice.controller.dto.UserRequest;
import pro.algotrade.userservice.controller.dto.UserResponse;
import pro.algotrade.userservice.mapper.utility.DtoStatus;
import pro.algotrade.userservice.mapper.utility.EntityStatus;
import pro.algotrade.userservice.mapper.utility.UserStatusResolver;
import pro.algotrade.userservice.persistence.UserEntity;

@Mapper(uses = UserStatusResolver.class)
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(source = "status", target = "status", qualifiedBy = EntityStatus.class)
    @Mapping(source = "login", target = "username")
    UserEntity dtoToEntity(UserRequest userRequest);


    @Mapping(source = "status", target = "status", qualifiedBy = DtoStatus.class)
    @Mapping(target = "login", source = "username")
    UserResponse entityToDto(UserEntity userEntity);
}
