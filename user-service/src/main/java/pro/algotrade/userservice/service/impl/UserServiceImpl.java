package pro.algotrade.userservice.service.impl;


import com.google.zxing.WriterException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import pro.algotrade.userservice.controller.dto.UserRequest;
import pro.algotrade.userservice.exception.UserAlreadyRegisteredException;
import pro.algotrade.userservice.exception.UserEntityNotFoundRuntimeException;
import pro.algotrade.userservice.exception.UserServiceGlobalRuntimeException;
import pro.algotrade.userservice.exception.config.GlobalErrorCode;
import pro.algotrade.userservice.persistence.UserEntity;
import pro.algotrade.userservice.persistence.repository.UserRepository;
import pro.algotrade.userservice.service.NotificationService;
import pro.algotrade.userservice.service.UserService;
import pro.algotrade.userservice.utility.QrCodeGenerator;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService, UserDetailsService {
    private final UserRepository repository;
    private final NotificationService mailService;
    private final PasswordEncoder bCryptPasswordEncoder;
    private final QrCodeGenerator qrCodeGenerator;

    public UserEntity create(UserEntity entity) {
        entity.setUuid(UUID.randomUUID().toString());

        try {
            entity.setQrCode(qrCodeGenerator.asByteArray(entity.getSecret(), 300, 300));
        } catch (WriterException | IOException e) {
            throw new UserServiceGlobalRuntimeException("error.qr_code.generation", GlobalErrorCode.ERROR_QR_CODE_GENERATION);
        }

        entity.setPassword(bCryptPasswordEncoder.encode(entity.getPassword()));

        Optional<UserEntity> lookupEntity = repository.findByUsername(entity.getUsername());
        if (lookupEntity.isPresent()) {
            throw new UserAlreadyRegisteredException();
        }

//        mailService.sentNotification(entity);

        return repository.save(entity);
    }

    @Override
    public Boolean delete(Long id) {
        UserEntity entity = repository.findById(id).orElseThrow(UserEntityNotFoundRuntimeException::new);
        repository.delete(entity);
        return true;
    }

    @Override
    public UserEntity update(Long id, UserRequest userRequest) {
        var personEntity = getById(id);

        repository.save(personEntity);
        return personEntity;
    }

    @Override
    public UserEntity getByUsername(String username) {
        return repository.findByUsername(username).orElseThrow(UserEntityNotFoundRuntimeException::new);
    }

    @Override
    public UserEntity getById(Long id) {
        return repository.findById(id).orElseThrow(UserEntityNotFoundRuntimeException::new);
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return repository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User " + username + "not found"));
    }
}
