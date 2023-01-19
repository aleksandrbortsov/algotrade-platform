package pro.algotrade.userservice.controller.dto;

import lombok.Data;
import pro.algotrade.userservice.persistence.utility.Role;
import pro.algotrade.userservice.persistence.utility.Status;


@Data
public class UserRequest {
    private String login;

    private String password;

    private Long personId;

    private String status = Status.USER_ACCOUNT_ACTIVE.getString();

    private String role = Role.VIEWER.toString();

}
