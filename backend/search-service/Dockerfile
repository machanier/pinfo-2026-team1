FROM eclipse-temurin:21-jre
WORKDIR /app
COPY search-service/target/quarkus-app/lib/ /app/lib/
COPY search-service/target/quarkus-app/*.jar /app/
COPY search-service/target/quarkus-app/app/ /app/app/
COPY search-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]

