package pro.algotrade.userservice.exception;

import pro.algotrade.userservice.exception.config.GlobalErrorCode;

public class PersonEntityNotFoundRuntimeException extends UserServiceGlobalRuntimeException {

    public PersonEntityNotFoundRuntimeException() {
        super("exception.person.not.found", GlobalErrorCode.ERROR_ENTITY_NOT_FOUND);
    }
}
