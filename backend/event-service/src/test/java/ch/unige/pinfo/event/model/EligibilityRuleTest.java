package ch.unige.pinfo.event.model;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EligibilityRuleTest {

    @Test
    void defaultConstructorInitializesEmptyLists() {
        EligibilityRule rule = new EligibilityRule();

        assertNotNull(rule.faculties);
        assertNotNull(rule.majors);
        assertNotNull(rule.degreeLevels);
        assertTrue(rule.faculties.isEmpty());
        assertTrue(rule.majors.isEmpty());
        assertTrue(rule.degreeLevels.isEmpty());
    }

    @Test
    void constructorWithNullParametersInitializesEmptyLists() {
        EligibilityRule rule = new EligibilityRule(null, null, null);

        assertNotNull(rule.faculties);
        assertNotNull(rule.majors);
        assertNotNull(rule.degreeLevels);
        assertTrue(rule.faculties.isEmpty());
        assertTrue(rule.majors.isEmpty());
        assertTrue(rule.degreeLevels.isEmpty());
    }

    @Test
    void constructorWithFacultiesOnly() {
        List<String> faculties = new ArrayList<>(List.of("Science", "Engineering"));

        EligibilityRule rule = new EligibilityRule(faculties, null, null);

        assertEquals(2, rule.faculties.size());
        assertEquals("Science", rule.faculties.get(0));
        assertEquals("Engineering", rule.faculties.get(1));
        assertTrue(rule.majors.isEmpty());
        assertTrue(rule.degreeLevels.isEmpty());
    }

    @Test
    void constructorWithAllParameters() {
        List<String> faculties = new ArrayList<>(List.of("Science", "Engineering"));
        List<String> majors = new ArrayList<>(List.of("CS", "Physics"));
        List<String> degreeLevels = new ArrayList<>(List.of("Bachelor", "Master"));

        EligibilityRule rule = new EligibilityRule(faculties, majors, degreeLevels);

        assertEquals(faculties, rule.faculties);
        assertEquals(majors, rule.majors);
        assertEquals(degreeLevels, rule.degreeLevels);
    }

    @Test
    void constructorWithPartialParameters() {
        List<String> majors = new ArrayList<>(List.of("CS", "EE"));

        EligibilityRule rule = new EligibilityRule(null, majors, null);

        assertTrue(rule.faculties.isEmpty());
        assertEquals(majors, rule.majors);
        assertTrue(rule.degreeLevels.isEmpty());
    }

    @Test
    void constructorAssignsListDirectly() {
        List<String> faculties = new ArrayList<>();
        faculties.add("Science");

        EligibilityRule rule = new EligibilityRule(faculties, null, null);

        // The constructor assigns the list directly (doesn't copy)
        assertSame(faculties, rule.faculties);

        // Verify modifications to the original list affect the rule
        faculties.add("Engineering");
        assertEquals(2, rule.faculties.size());
    }

    @Test
    void listsCanBeModifiedAfterConstruction() {
        EligibilityRule rule = new EligibilityRule(null, null, null);

        rule.faculties.add("Science");
        rule.majors.add("CS");
        rule.degreeLevels.add("Bachelor");

        assertEquals(1, rule.faculties.size());
        assertEquals("Science", rule.faculties.get(0));
        assertEquals(1, rule.majors.size());
        assertEquals("CS", rule.majors.get(0));
        assertEquals(1, rule.degreeLevels.size());
        assertEquals("Bachelor", rule.degreeLevels.get(0));
    }

    @Test
    void constructorWithEmptyLists() {
        EligibilityRule rule = new EligibilityRule(
                new ArrayList<>(),
                new ArrayList<>(),
                new ArrayList<>());

        assertTrue(rule.faculties.isEmpty());
        assertTrue(rule.majors.isEmpty());
        assertTrue(rule.degreeLevels.isEmpty());
    }

    @Test
    void fieldsAreIndependent() {
        List<String> faculties = new ArrayList<>(List.of("Science"));
        List<String> majors = new ArrayList<>(List.of("CS"));
        List<String> degreeLevels = new ArrayList<>(List.of("Bachelor"));

        EligibilityRule rule = new EligibilityRule(faculties, majors, degreeLevels);

        // Modifying one field doesn't affect others
        rule.faculties.add("Engineering");
        assertEquals(2, rule.faculties.size());
        assertEquals(1, rule.majors.size());
        assertEquals(1, rule.degreeLevels.size());
    }

    @Test
    void multipleRulesWithSeparateLists() {
        List<String> faculties1 = new ArrayList<>(List.of("Science"));
        List<String> faculties2 = new ArrayList<>(List.of("Engineering"));

        EligibilityRule rule1 = new EligibilityRule(faculties1, null, null);
        EligibilityRule rule2 = new EligibilityRule(faculties2, null, null);

        // Each rule has its own list
        rule1.faculties.add("Arts");
        assertEquals(2, rule1.faculties.size());
        assertEquals(1, rule2.faculties.size());
    }
}
