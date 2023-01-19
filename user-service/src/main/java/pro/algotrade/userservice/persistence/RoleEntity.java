package pro.algotrade.userservice.persistence;

import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import pro.algotrade.userservice.persistence.utility.Role;

import javax.persistence.*;
import java.io.Serializable;
import java.math.BigInteger;
import java.util.Set;

@Entity
@Table(name = "T_ROLES")
@Data
public class RoleEntity implements Serializable, GrantedAuthority {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(value = EnumType.STRING)
    @Column(name = "NAME", unique = true, nullable = false)
    private Role roleType;

    private boolean isDefaultRole;

    @ManyToMany(mappedBy = "authorities", fetch = FetchType.EAGER)
    private Set<UserEntity> user;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "T_ROLES_PERMISSIONS",
        joinColumns = @JoinColumn(name = "role_id", referencedColumnName = "id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id", referencedColumnName = "id"))
    private Set<PermissionEntity> permissions;

    @Override
    public String getAuthority() {
        return permissions.toString();
    }
}
