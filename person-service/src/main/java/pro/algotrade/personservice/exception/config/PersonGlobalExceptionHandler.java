package pro.algotrade.personservice.exception.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import pro.algotrade.personservice.exception.PersonServiceGlobalRuntimeException;

import java.util.Locale;

@ControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class PersonGlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(PersonServiceGlobalRuntimeException.class)
    protected ResponseEntity handleGlobalException(PersonServiceGlobalRuntimeException e, Locale locale) {
        log.info(messageSource.getMessage(e.getMessage(), null, locale));

        return ResponseEntity
                .badRequest()
                .body(ErrorResponse
                        .builder()
                        .code(e.getCode())
                        .message(messageSource.getMessage(e.getMessage(), null, locale))
                        .build());
    }

    @ExceptionHandler({Exception.class})
    protected ResponseEntity handleException(Exception e) {
        return ResponseEntity
                .badRequest()
                .body("Exception occurred inside Person Service" + e);
    }
}
