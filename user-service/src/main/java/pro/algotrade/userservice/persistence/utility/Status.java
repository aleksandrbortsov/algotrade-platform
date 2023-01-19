package pro.algotrade.userservice.persistence.utility;

public enum Status {
    USER_ACCOUNT_ACTIVE(1, "active"),
    USER_ACCOUNT_EXPIRED(2, "expired"),
    USER_ACCOUNT_LOCKED(3, "locked"),
    USER_CREDENTIALS_EXPIRED(4, "Credentials are expired"),
    USER_ACCOUNT_ENABLE(5, "enable");

    private final int code;
    private final String name;

    Status(int code, String name) {
        this.code = code;
        this.name = name;
    }

    public int getCode() {
        return code;
    }

    public String getString() {
        return name;
    }
}
