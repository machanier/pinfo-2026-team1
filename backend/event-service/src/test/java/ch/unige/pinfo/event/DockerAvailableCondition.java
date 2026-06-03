package ch.unige.pinfo.event;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

import java.io.File;

/**
 * JUnit 5 {@link ExecutionCondition} qui désactive les classes/méthodes de test
 * lorsque Docker n'est pas disponible (pas de {@code /var/run/docker.sock} et pas de
 * variable d'environnement {@code DOCKER_HOST}).
 *
 * <p>Utilisé sur les tests d'intégration Kafka pour les passer en SKIPPED
 * (plutôt que ERROR) dans les environnements CI/dev sans Docker, <em>avant</em>
 * que Quarkus ne tente de démarrer {@code KafkaCompanionResource} via Testcontainers.
 */
public class DockerAvailableCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        if (new File("/var/run/docker.sock").exists() || System.getenv("DOCKER_HOST") != null) {
            return ConditionEvaluationResult.enabled("Docker is available");
        }
        return ConditionEvaluationResult.disabled(
                "Docker socket not found and DOCKER_HOST not set – Kafka integration tests skipped");
    }
}
