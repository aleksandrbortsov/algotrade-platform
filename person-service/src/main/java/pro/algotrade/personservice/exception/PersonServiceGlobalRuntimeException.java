package pro.algotrade.personservice.exception;

import lombok.Getter;

@Getter
public class PersonServiceGlobalRuntimeException extends RuntimeException {
    private final Long code;

    public PersonServiceGlobalRuntimeException(String message, Long code) {
        super(message);
        this.code = code;
    }
}
