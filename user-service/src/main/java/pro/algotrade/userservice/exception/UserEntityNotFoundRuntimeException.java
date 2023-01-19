package pro.algotrade.userservice.exception;

import pro.algotrade.userservice.exception.config.GlobalErrorCode;

public class UserEntityNotFoundRuntimeException extends UserServiceGlobalRuntimeException {

    public UserEntityNotFoundRuntimeException() {
        super("exception.user.not.found", GlobalErrorCode.ERROR_ENTITY_NOT_FOUND);
    }

    public UserEntityNotFoundRuntimeException(String message, Long code) {
        super(message, code);
    }
}
