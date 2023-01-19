package pro.algotrade.userservice.exception.config;

public final class GlobalErrorCode {
    private GlobalErrorCode() {
    }

    public static final Long INTERNAL_ERROR = 1000L;
    public static final Long ERROR_ENTITY_NOT_FOUND = 1001L;
    public static final Long ERROR_USER_ALREADY_REGISTERED = 1002L;
    public static final Long ERROR_QR_CODE_GENERATION = 1003L;

}
