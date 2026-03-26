package ch.unige.pinfo.user.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true, nullable = false)
    public String auth0Id;

    public String email;

    public String name;

    public String picture;

    // On enlève @Transient pour que le rôle soit sauvegardé en base !
    public String role;
}