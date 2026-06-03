package ch.unige.pinfo.search.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SearchEventTest {

    @Test
    void testGetAvailableSlots() {
        SearchEvent event = new SearchEvent();

        // Cas 1 : Capacité non définie
        assertNull(event.getAvailableSlots());

        // Cas 2 : Calcul normal
        event.capacity = 100;
        event.registeredCount = 30;
        assertEquals(70, event.getAvailableSlots());

        // Cas 3 : Plus d'inscrits que de capacité (sécurité)
        event.registeredCount = 120;
        assertEquals(0, event.getAvailableSlots());
    }
}