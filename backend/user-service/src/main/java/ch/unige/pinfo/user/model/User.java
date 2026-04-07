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

    public String getAuth0Id() {
        return auth0Id;
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column
    private String avatarUrl;

    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private OffsetDateTime createdAt;

    // Student-specific fields
    @Column
    private String faculty;

    @Column
    private String major;

    @Enumerated(EnumType.STRING)
    @Column
    private DegreeLevel degreeLevel;

    // Association-specific fields
    @Column
    private String associationName;

    @Column(name = "association_description")
    private String associationDescription;

    @Column
    private Boolean associationVerified;

    @Column
    private String associationLogoUrl;

    // Constructors
    public User() {
    }

    public User(String auth0Id, String name, UserRole role) {
        this.auth0Id = auth0Id;
        this.name = name;
        this.role = role;
        this.createdAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAuth0Id() {
        return auth0Id;
    }

    public void setAuth0Id(String auth0Id) {
        this.auth0Id = auth0Id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    <<<<<<<HEAD

    public String getRole() {
=======

    public UserRole getRole() {
>>>>>>> 8f2e8e7 (feature(PINFO-115) : Ajout de la logique de check de slots. Tests des 4 features (112-115) avec des implémentations de User et Event Service provisoires. Refaire les tests avec les vraies implémentations des services)
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    <<<<<<<HEAD

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    =======>>>>>>>8f 2e8e7 (feature(PINFO-115) : Ajout de la logique de check de slots. Tests des 4 features (112-115) avec des implémentations de User et Event Service provisoires. Refaire les tests avec les vraies implémentations des services)

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    <<<<<<<HEAD

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }=======

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public DegreeLevel getDegreeLevel() {
        return degreeLevel;
    }

    public void setDegreeLevel(DegreeLevel degreeLevel) {
        this.degreeLevel = degreeLevel;
    }

    public String getAssociationName() {
        return associationName;
    }

    public void setAssociationName(String associationName) {
        this.associationName = associationName;
    }

    public String getAssociationDescription() {
        return associationDescription;
    }

    public void setAssociationDescription(String associationDescription) {
        this.associationDescription = associationDescription;
    }

    public Boolean getAssociationVerified() {
        return associationVerified;
    }

    public void setAssociationVerified(Boolean associationVerified) {
        this.associationVerified = associationVerified;
    }

    public String getAssociationLogoUrl() {
        return associationLogoUrl;
    }

    public void setAssociationLogoUrl(String associationLogoUrl) {
        this.associationLogoUrl = associationLogoUrl;
    }

    >>>>>>>8f 2e8e7 (feature(PINFO-115) : Ajout de la logique de check de slots. Tests des 4 features (112-115) avec des implémentations de User et Event Service provisoires. Refaire les tests avec les vraies implémentations des services)
}