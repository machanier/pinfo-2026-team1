package ch.unige.pinfo.registration;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.util.HashMap;
import java.util.Map;

public class H2DatabaseTestResource implements QuarkusTestResourceLifecycleManager {
    @Override
    public Map<String, String> start() {
        Map<String, String> conf = new HashMap<>();
        conf.put("quarkus.datasource.db-kind", "h2");
        conf.put("quarkus.datasource.jdbc.url", "jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        conf.put("quarkus.hibernate-orm.database.generation", "drop-and-create");
        conf.put("quarkus.hibernate-orm.dialect", "org.hibernate.dialect.H2Dialect");
        return conf;
    }

    @Override
    public void stop() {
        // Rien à faire ici
    }
}