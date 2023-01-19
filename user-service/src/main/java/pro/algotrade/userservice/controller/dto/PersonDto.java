package pro.algotrade.userservice.controller.dto;

import lombok.Data;

import java.util.Date;

@Data
public class PersonDto {
    private Long id;
    private String uuid;
    private String firstName;
    private String lastName;
    private String email;
    private Date birthday;
}
