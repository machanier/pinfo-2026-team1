package karate;

import com.intuit.karate.junit5.Karate;

/**
 * JUnit 5 runner for all Karate feature files.
 */
class KarateRunner {

    /**
     * Runs every .feature file found on the classpath under the
     * package root (i.e. everything in test/).
     */
    @Karate.Test
    Karate all() {
        return Karate.run().relativeTo(getClass());
    }

}


