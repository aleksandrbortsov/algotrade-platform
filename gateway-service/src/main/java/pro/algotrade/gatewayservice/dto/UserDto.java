package pro.algotrade.gatewayservice.dto;

import lombok.Data;

@Data
public class UserDto {
    private long id;
    private String login;
    private String token;
}
