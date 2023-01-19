package pro.algotrade.userservice.exception;

import pro.algotrade.userservice.exception.config.GlobalErrorCode;

public class UserAlreadyRegisteredException extends UserServiceGlobalRuntimeException {

    public UserAlreadyRegisteredException() {
        super("exception.user.already.registered", GlobalErrorCode.ERROR_USER_ALREADY_REGISTERED);
    }

    public UserAlreadyRegisteredException(String message, Long code) {
        super(message, code);
    }
}
