FROM eclipse-temurin:21-jre@sha256:ff65ff0d43c73d2b675eb4b758665a5cb487e7df127436a9979f8172c144c819
WORKDIR /app
COPY moderation-service/target/quarkus-app/lib/ /app/lib/
COPY moderation-service/target/quarkus-app/*.jar /app/
COPY moderation-service/target/quarkus-app/app/ /app/app/
COPY moderation-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
