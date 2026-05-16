# Doppler-wrapped Quarkus dev commands.
# Requires the Doppler CLI (`brew install dopplerhq/cli/doppler`) and a
# one-time `doppler login` + `doppler setup` from the repo root.
#
# To bypass Doppler (offline / debugging), call mvnw directly:
#   ./mvnw -pl user-service quarkus:dev

DOPPLER := doppler run --

.PHONY: dev-user dev-event dev-registration dev-notification dev-search dev-moderation

dev-user:
	$(DOPPLER) ./mvnw -pl user-service quarkus:dev

dev-event:
	$(DOPPLER) ./mvnw -pl event-service quarkus:dev

dev-registration:
	$(DOPPLER) ./mvnw -pl registration-service quarkus:dev

dev-notification:
	$(DOPPLER) ./mvnw -pl notification-service quarkus:dev

dev-search:
	$(DOPPLER) ./mvnw -pl search-service quarkus:dev

dev-moderation:
	$(DOPPLER) ./mvnw -pl moderation-service quarkus:dev
