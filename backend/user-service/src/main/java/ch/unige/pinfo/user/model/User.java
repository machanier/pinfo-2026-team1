package ch.unige.pinfo.user.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User extends PanacheEntity {

    @Column(unique = true, nullable = false)
    public String auth0Id;

    @Column(nullable = true)
    public String email;

    public String name;

    public String picture;
}
