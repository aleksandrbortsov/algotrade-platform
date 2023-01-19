package pro.algotrade.userservice.mapper.utility;

import pro.algotrade.userservice.persistence.utility.Status;

public class UserStatusResolver {

    @EntityStatus
    public Status resolveToEntity(String status) {
        if (status == null) {
            return Status.USER_ACCOUNT_ACTIVE;
        }
        switch (status) {
            case "expired":
                return Status.USER_ACCOUNT_EXPIRED;
            case "locked":
                return Status.USER_ACCOUNT_LOCKED;
            case "Credentials are expired":
                return Status.USER_CREDENTIALS_EXPIRED;
            default:
                return Status.USER_ACCOUNT_ENABLE;
        }
    }

    @DtoStatus
    public String resolveToDto(Status status) {
        if (status == null) {
            return Status.USER_ACCOUNT_ACTIVE.getString();
        }
        switch (status) {
            case USER_ACCOUNT_EXPIRED:
                return Status.USER_ACCOUNT_EXPIRED.getString();
            case USER_ACCOUNT_LOCKED:
                return Status.USER_ACCOUNT_LOCKED.getString();
            case USER_CREDENTIALS_EXPIRED:
                return Status.USER_CREDENTIALS_EXPIRED.getString();
            default:
                return Status.USER_ACCOUNT_ENABLE.getString();
        }
    }
}
