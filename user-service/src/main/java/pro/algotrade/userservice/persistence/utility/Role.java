package pro.algotrade.userservice.persistence.utility;

public enum Role {
    OWNER,
    TRADER,
    VIEWER;

    public static Role findByStringType(String roleType) {
        for (Role roleItem : values()) {
            if (roleItem.name().equals(roleType)) {
                return roleItem;
            }
        }
        return null;
    }
}
