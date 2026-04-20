package ch.unige.pinfo.user.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import io.quarkus.runtime.StartupEvent;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AvatarUrlSchemaMigrator {

    private static final Logger LOG = Logger.getLogger(AvatarUrlSchemaMigrator.class);

    @Inject
    EntityManager entityManager;

    @Transactional
    void onStart(@Observes StartupEvent event) {
        try {
            Object currentType = entityManager
                    .createNativeQuery("""
                            SELECT data_type
                            FROM information_schema.columns
                            WHERE table_name = 'users'
                              AND column_name = 'avatarurl'
                            """)
                    .getSingleResult();

            String normalizedType = currentType == null ? "" : String.valueOf(currentType).toLowerCase();

            if (!"text".equals(normalizedType)) {
                entityManager.createNativeQuery("ALTER TABLE users ALTER COLUMN avatarurl TYPE TEXT")
                        .executeUpdate();
                LOG.info("Migrated users.avatarurl column to TEXT");
            }
        } catch (Exception e) {
            LOG.warn("Could not verify/migrate users.avatarurl column type", e);
        }
    }
}
