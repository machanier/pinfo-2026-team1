package ch.unige.pinfo.search.service;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Groups all search filter and pagination parameters for
 * {@link EventSearchService#search(SearchParams)}.
 *
 * <p>Introduced to keep method signatures under the 7-parameter limit
 * (SonarCloud java:S107).
 */
public record SearchParams(
        String q,
        String category,
        String faculty,
        String degreeLevel,
        LocalDate dateFrom,
        LocalDate dateTo,
        String place,
        UUID organizerId,
        Boolean hasAvailableSlots,
        String sort,
        int page,
        int size
) {}
