package ch.unige.pinfo.registration.dto;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class EligibilityAttributesDTOTest {

    @Test
    @DisplayName("Should correctly initialize via full constructor and return values via getters")
    void testFullConstructorAndGetters() {
        // GIVEN
        UUID userId = UUID.randomUUID();
        String faculty = "Sciences";
        String major = "Computer Science";
        String degreeLevel = "Bachelor";

        // WHEN
        EligibilityAttributesDTO dto = new EligibilityAttributesDTO(userId, faculty, major, degreeLevel);

        // THEN
        assertAll("Constructor validation",
                () -> assertEquals(userId, dto.getUserId()),
                () -> assertEquals(faculty, dto.getFaculty()),
                () -> assertEquals(major, dto.getMajor()),
                () -> assertEquals(degreeLevel, dto.getDegreeLevel()));
    }

    @Test
    @DisplayName("Should allow instantiation via default constructor")
    void testDefaultConstructor() {
        // GIVEN & WHEN
        EligibilityAttributesDTO dto = new EligibilityAttributesDTO();

        // THEN: Jacoco a besoin que ce constructeur soit appelé explicitement
        assertNotNull(dto, "Default constructor should create a non-null instance");
        assertNull(dto.getUserId(), "Fields should be null by default");
        assertNull(dto.getFaculty());
        assertNull(dto.getMajor());
        assertNull(dto.getDegreeLevel());
    }
}