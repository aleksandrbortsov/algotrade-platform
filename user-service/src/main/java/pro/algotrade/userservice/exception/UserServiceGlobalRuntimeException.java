package pro.algotrade.userservice.exception;

import lombok.Getter;

@Getter
public class UserServiceGlobalRuntimeException extends RuntimeException {
    private final Long code;

    public UserServiceGlobalRuntimeException(String message, Long code) {
        super(message);
        this.code = code;
    }
}
