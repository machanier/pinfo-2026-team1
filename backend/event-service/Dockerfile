FROM eclipse-temurin:21-jre
WORKDIR /app
COPY event-service/target/quarkus-app/lib/ /app/lib/
COPY event-service/target/quarkus-app/*.jar /app/
COPY event-service/target/quarkus-app/app/ /app/app/
COPY event-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
