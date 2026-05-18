package ch.unige.pinfo.event.mapper;

import ch.unige.pinfo.event.model.Event;
import ch.unige.pinfo.event.openapi.model.EventResponse;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Converts {@link Event} entities to OpenAPI response models.
 *
 * Centralises mapping logic shared by {@code EventResource} and
 * {@code InternalEventResource}.
 */
@ApplicationScoped
public class EventMapper {

    /**
     * Maps an {@link Event} entity to an {@link EventResponse}.
     *
     * @param event           the entity to map
     * @param registeredCount the current number of confirmed+pending registrations
     * @return the mapped response
     */
    public EventResponse toEventResponse(Event event, int registeredCount) {
        EventResponse response = new EventResponse();
        response.setEventId(event.eventId);
        response.setTitle(event.title);
        response.setDescription(event.description);
        response.setPlace(event.place);
        response.setTime(event.time);
        response.setEndTime(event.endTime);
        response.setOrganizerId(event.organizerId);
        response.setCapacity(event.capacity);
        response.setRegisteredCount(registeredCount);
        response.setStatus(event.status);
        if (event.restrictedTo != null) {
            response.setRestrictedTo(toApiEligibilityRule(event.restrictedTo));
        }
        response.setTags(event.tags);
        response.setCategory(event.category);
        response.setCreatedAt(event.createdAt);
        response.setUpdatedAt(event.updatedAt);
        response.setBannerImageUrl(event.bannerImageUrl);
        return response;
    }

    /**
     * Converts an entity {@link ch.unige.pinfo.event.model.EligibilityRule}
     * to the OpenAPI model equivalent.
     */
    public ch.unige.pinfo.event.openapi.model.EligibilityRule toApiEligibilityRule(
            ch.unige.pinfo.event.model.EligibilityRule entityRule) {
        if (entityRule == null)
            return null;
        ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule = new ch.unige.pinfo.event.openapi.model.EligibilityRule();
        apiRule.setFaculties(entityRule.faculties);
        apiRule.setMajors(entityRule.majors);
        if (entityRule.degreeLevels != null) {
            apiRule.setDegreeLevels(entityRule.degreeLevels.stream()
                    .map(ch.unige.pinfo.event.openapi.model.EligibilityRule.DegreeLevelsEnum::fromValue)
                    .toList());
        }
        return apiRule;
    }

    /**
     * Converts an OpenAPI
     * {@link ch.unige.pinfo.event.openapi.model.EligibilityRule}
     * to the entity model equivalent.
     */
    public ch.unige.pinfo.event.model.EligibilityRule toEntityEligibilityRule(
            ch.unige.pinfo.event.openapi.model.EligibilityRule apiRule) {
        if (apiRule == null)
            return null;
        ch.unige.pinfo.event.model.EligibilityRule entityRule = new ch.unige.pinfo.event.model.EligibilityRule();
        entityRule.faculties = apiRule.getFaculties();
        entityRule.majors = apiRule.getMajors();
        if (apiRule.getDegreeLevels() != null) {
            entityRule.degreeLevels = apiRule.getDegreeLevels().stream()
                    .map(Enum::toString)
                    .toList();
        }
        return entityRule;
    }
}
