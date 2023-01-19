package pro.algotrade.userservice.persistence;

import lombok.Data;
import org.jboss.aerogear.security.otp.api.Base32;
import org.springframework.security.core.userdetails.UserDetails;
import pro.algotrade.userservice.persistence.utility.Status;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Set;

@Entity
@Table(name = "T_USERS")
@Data
public class UserEntity implements Serializable, UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String uuid;

    private String username;

    private String password;

    private String secret = Base32.random();

    @Column(columnDefinition = "BLOB")
    private byte[] qrCode;

    private Long personId;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "T_USERS_ROLES",
        joinColumns = @JoinColumn(name = "user_id", referencedColumnName = "id"),
        inverseJoinColumns = @JoinColumn(name = "role_id", referencedColumnName = "id"))
    private Set<RoleEntity> authorities;

    @Column(columnDefinition = "TINYINT")
    private Status status = Status.USER_ACCOUNT_ACTIVE;

    private boolean accountNonExpired = true;
    private boolean accountNonLocked = true;
    private boolean credentialsNonExpired = true;
    private boolean enabled = true;

    /* Multi-factor authentication */
    private boolean mfa = false;
}
