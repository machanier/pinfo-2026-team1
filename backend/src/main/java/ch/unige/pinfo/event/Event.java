package ch.unige.pinfo.event;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Entité JPA représentant un événement universitaire.
 *
 * PanacheEntity fournit automatiquement :
 *   - un champ `id` (Long, auto-généré)
 *   - des méthodes utilitaires : listAll(), findById(), persist(), delete()...
 *
 * La table correspondante en base de données s'appellera "event".
 */
@Entity
@Table(name = "event")
public class Event extends PanacheEntity {

    /** Titre de l'événement. Obligatoire. */
    @NotBlank
    public String title;

    /** Description de l'événement. */
    @Column(columnDefinition = "TEXT")
    public String description;

    /** Date de l'événement. Obligatoire. */
    @NotNull
    public LocalDate date;

    /** Lieu de l'événement (ex: Uni Mail, Uni Bastions...). */
    public String location;
}
