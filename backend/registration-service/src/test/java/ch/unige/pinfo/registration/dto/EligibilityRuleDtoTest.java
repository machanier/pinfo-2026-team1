package ch.unige.pinfo.registration.dto;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EligibilityRuleDtoTest {

    @Test
    @DisplayName("Should verify DTO collections and their initial state")
    void testDtoGetters() {
        EligibilityRuleDto dto = new EligibilityRuleDto();

        // On vérifie que les listes sont initialisées par défaut (évite les NPE)
        assertNotNull(dto.getFaculties());
        assertNotNull(dto.getMajors());
        assertNotNull(dto.getDegreeLevels());

        // Test de mutation simple pour la couverture Jacoco
        dto.getFaculties().add("Science");
        dto.getMajors().add("CS");
        dto.getDegreeLevels().add(EligibilityRuleDto.DegreeLevelsEnum.BACHELOR);

        assertEquals(1, dto.getFaculties().size());
        assertEquals("Science", dto.getFaculties().get(0));
        assertEquals(EligibilityRuleDto.DegreeLevelsEnum.BACHELOR, dto.getDegreeLevels().get(0));
    }

    @ParameterizedTest
    @ValueSource(strings = { "BACHELOR", "MASTER", "PHD" })
    @DisplayName("Should correctly map valid strings to Enum values")
    void testEnumFromValue(String value) {
        EligibilityRuleDto.DegreeLevelsEnum result = EligibilityRuleDto.DegreeLevelsEnum.fromValue(value);
        assertEquals(value, result.getValue());
    }

    @Test
    @DisplayName("Should throw exception for unexpected enum values")
    void testEnumFromValueInvalid() {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            EligibilityRuleDto.DegreeLevelsEnum.fromValue("INVALID_LEVEL");
        });

        assertTrue(exception.getMessage().contains("Unexpected value 'INVALID_LEVEL'"));
    }

    @Test
    @DisplayName("Should cover Enum valueOf and values for Sonar standards")
    void testEnumTechnicalMethods() {
        assertNotNull(EligibilityRuleDto.DegreeLevelsEnum.valueOf("BACHELOR"));
        assertEquals(3, EligibilityRuleDto.DegreeLevelsEnum.values().length);
    }
}