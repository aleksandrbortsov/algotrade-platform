package pro.algotrade.userservice.controller.dto;

import lombok.Data;

@Data
public class UserResponse {
    private Long id;

    private String uuid;

    private String login;

    private PersonDto person;

    private String status;
}
