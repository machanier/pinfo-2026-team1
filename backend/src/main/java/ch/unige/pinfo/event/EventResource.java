package ch.unige.pinfo.event;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

/**
 * Ressource REST exposant les endpoints /api/events.
 *
 * @Path       → l'URL de base pour cette ressource
 * @Produces   → le format de réponse (JSON)
 * @Consumes   → le format accepté en entrée (JSON)
 */
@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventResource {

    /**
     * GET /api/events
     * Retourne la liste de tous les événements.
     */
    @GET
    public List<Event> getAllEvents() {
        return Event.listAll();
    }

    /**
     * GET /api/events/{id}
     * Retourne un événement par son identifiant.
     * Retourne 404 si l'événement n'existe pas.
     */
    @GET
    @Path("/{id}")
    public Response getEventById(@PathParam("id") Long id) {
        Event event = Event.findById(id);
        if (event == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(event).build();
    }

    /**
     * POST /api/events
     * Crée un nouvel événement.
     * @Transactional → obligatoire pour toute opération d'écriture en base.
     */
    @POST
    @Transactional
    public Response createEvent(@Valid Event event) {
        event.persist();
        return Response.status(Response.Status.CREATED).entity(event).build();
    }

    /**
     * DELETE /api/events/{id}
     * Supprime un événement par son identifiant.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteEvent(@PathParam("id") Long id) {
        boolean deleted = Event.deleteById(id);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }
}
