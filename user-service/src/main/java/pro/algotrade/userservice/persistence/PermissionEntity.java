package pro.algotrade.userservice.persistence;

import lombok.Data;

import javax.persistence.*;
import java.io.Serializable;
import java.math.BigInteger;
import java.util.Set;

@Entity
@Table(name = "T_PERMISSIONS")
@Data
public class PermissionEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    private Long value;

    @ManyToMany(mappedBy = "permissions", fetch = FetchType.EAGER)
    private Set<RoleEntity> roles;
}
