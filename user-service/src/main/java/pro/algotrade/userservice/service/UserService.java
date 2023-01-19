package pro.algotrade.userservice.service;

import pro.algotrade.userservice.controller.dto.UserRequest;
import pro.algotrade.userservice.persistence.UserEntity;


public interface UserService {
    UserEntity create(UserEntity userEntity);

    UserEntity getById(Long id);

    Boolean delete(Long id);

    UserEntity update(Long id, UserRequest userRequest);

    UserEntity getByUsername(String username);
}
