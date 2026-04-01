FROM eclipse-temurin:21-jre
WORKDIR /app
COPY moderation-service/target/quarkus-app/lib/ /app/lib/
COPY moderation-service/target/quarkus-app/*.jar /app/
COPY moderation-service/target/quarkus-app/app/ /app/app/
COPY moderation-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
