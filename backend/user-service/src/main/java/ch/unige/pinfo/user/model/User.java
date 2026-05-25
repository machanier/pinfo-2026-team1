package ch.unige.pinfo.user.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Inheritance;
import jakarta.persistence.Table;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Id;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
// On renomme le table pour éviter des conflits avec 'User' qui est un terme
// réservé pour postgreSQL
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
public class User extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // Hibernate génère un UUID automatiquement
    public UUID id; // clé primaire

    @Column(unique = true, nullable = false)
    public String auth0Id; // une autre clé

    public static final String AUTH0_ID_FIELD = "auth0Id";

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String role; // STUDENT, ORGANIZER, ADMIN

    // PINFO-195: pin column type to TEXT to match what the live prod DB
    // already carries. Without this, Hibernate would default to
    // VARCHAR(255) and `validate` mode in prod would refuse to start
    // because TEXT ≠ VARCHAR(255). The functional behaviour is
    // unchanged — a Cloudinary / Gravatar URL fits in 255 chars
    // (PINFO-193 caps it at 512 anyway).
    @Column(columnDefinition = "TEXT")
    public String avatarUrl;

    @Column(nullable = false)
    public boolean active = true; // pour soft delete

    @Column(nullable = false)
    public OffsetDateTime createdAt;

    @Column(unique = true, nullable = false)
    public String email;

    @PrePersist
    public void prePersist() {
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAuth0Id() {
        return auth0Id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}