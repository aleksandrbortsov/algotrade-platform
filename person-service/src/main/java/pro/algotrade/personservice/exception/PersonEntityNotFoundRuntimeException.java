package pro.algotrade.personservice.exception;

import pro.algotrade.personservice.exception.config.GlobalErrorCode;

public class PersonEntityNotFoundRuntimeException extends PersonServiceGlobalRuntimeException {

    public PersonEntityNotFoundRuntimeException() {
        super("exception.person.not.found", GlobalErrorCode.ERROR_ENTITY_NOT_FOUND);
    }

    public PersonEntityNotFoundRuntimeException(String message, Long code) {
        super(message, code);
    }
}
