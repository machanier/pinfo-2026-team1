package ch.unige.pinfo.moderation.repository;

import ch.unige.pinfo.moderation.model.ModerationCase;
import java.util.UUID;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ModerationCaseRepository implements PanacheRepositoryBase<ModerationCase, UUID> {

}