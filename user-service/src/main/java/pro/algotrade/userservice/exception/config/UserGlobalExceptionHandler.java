package pro.algotrade.userservice.exception.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import pro.algotrade.userservice.exception.UserServiceGlobalRuntimeException;

import java.util.Locale;

@ControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class UserGlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(UserServiceGlobalRuntimeException.class)
    protected ResponseEntity handleGlobalException(UserServiceGlobalRuntimeException e, Locale locale) {
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
