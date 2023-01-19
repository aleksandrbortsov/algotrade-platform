package pro.algotrade.personservice.persistence;

import lombok.Data;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "t_persons")
@Data
public class PersonEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String uuid;
    private String firstName;
    private String lastName;
    private String email;
    private Date birthday;
    private Long userId;
}
