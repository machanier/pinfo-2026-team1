package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.NotificationPreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class NotificationPreferenceRepository implements PanacheRepositoryBase<NotificationPreference, UUID> {

}
