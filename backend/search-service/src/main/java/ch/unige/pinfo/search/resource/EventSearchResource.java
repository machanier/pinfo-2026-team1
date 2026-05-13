package ch.unige.pinfo.search.resource;

import ch.unige.pinfo.search.openapi.api.EventsApi;
import ch.unige.pinfo.search.openapi.model.EventSearchResult;
import ch.unige.pinfo.search.openapi.model.ApiSearchEventsSuggestionsGet200Response; // Vérifie ce nom dans ton dossier target
import ch.unige.pinfo.search.service.EventSearchService;
import ch.unige.pinfo.search.model.SearchEvent;
import jakarta.inject.Inject;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.BadRequestException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Path("/api/search/events")
public class EventSearchResource implements EventsApi {

    @Inject
    EventSearchService searchService;

    // 1. Recherche principale
    @Override
    public EventSearchResult apiSearchEventsGet(String q, String category, LocalDate dateFrom, LocalDate dateTo,
            String place, UUID organizerId, String faculty,
            String degreeLevel, Boolean hasAvailableSlots,
            String sort, Integer page, Integer size) {

        // On passe les paramètres au service (assure-toi que la signature du service
        // accepte Integer)
        return searchService.search(q, category, faculty, page != null ? page : 0, size != null ? size : 20);
    }

    // 2. Suggestions d'autocomplétion (La méthode manquante)
    @Override
    public ApiSearchEventsSuggestionsGet200Response apiSearchEventsSuggestionsGet(String q, Integer limit) {
        if (q == null || q.length() < 2) {
            throw new BadRequestException("Query string is too short (min 2 chars)");
        }

        int finalLimit = (limit != null) ? limit : 8;

        // Requête simple sur les titres pour les suggestions
        List<String> suggestions = SearchEvent.<SearchEvent>find("lower(title) like ?1", "%" + q.toLowerCase() + "%")
                .page(0, finalLimit)
                .<SearchEvent>list()
                .stream()
                .map(e -> e.title)
                .collect(java.util.stream.Collectors.toList());

        // On encapsule dans l'objet de réponse attendu par le YAML
        ApiSearchEventsSuggestionsGet200Response response = new ApiSearchEventsSuggestionsGet200Response();
        response.setSuggestions(suggestions);

        return response;
    }
}