package pro.algotrade.personservice.exception;

import pro.algotrade.personservice.exception.config.GlobalErrorCode;

public class PersonAlreadyRegisteredException extends PersonServiceGlobalRuntimeException {

    public PersonAlreadyRegisteredException() {
        super("exception.person.already.registered", GlobalErrorCode.ERROR_USER_ALREADY_REGISTERED);
    }

    public PersonAlreadyRegisteredException(String message, Long code) {
        super(message, code);
    }
}
