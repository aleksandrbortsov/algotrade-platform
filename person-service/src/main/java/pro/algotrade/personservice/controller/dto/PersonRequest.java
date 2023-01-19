package pro.algotrade.personservice.controller.dto;

import lombok.Data;

import java.util.Date;

@Data
public class PersonRequest {
    private String firstName;
    private String lastName;
    private String email;
    private Date birthday;
    private Long userId;
}
