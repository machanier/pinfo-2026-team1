package ch.unige.pinfo.notification.repository;

import ch.unige.pinfo.notification.model.NotificationPreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class NotificationPreferenceRepository implements PanacheRepositoryBase<NotificationPreference, UUID> {

    // Returns the largest reminderLeadTimeHours across all users so the scheduler can look far enough ahead to cover every user’s reminder window
	public Integer findMaxReminderLeadTimeHours() {
		return getEntityManager()
				.createQuery("select max(p.reminderLeadTimeHours) from NotificationPreference p", Integer.class)
				.getSingleResult();
	}

}
