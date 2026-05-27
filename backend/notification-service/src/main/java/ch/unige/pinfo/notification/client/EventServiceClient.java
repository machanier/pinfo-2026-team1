package ch.unige.pinfo.notification.client;

import java.util.List;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "event-service")
@Path("/api/events")
public interface EventServiceClient {

    @GET
    @Path("/calendar")
    List<EventCalendarEntry> getCalendarEntries(@QueryParam("from") String from,
            @QueryParam("to") String to);
}
