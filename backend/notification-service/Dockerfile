FROM eclipse-temurin:21-jre
WORKDIR /app
COPY notification-service/target/quarkus-app/lib/ /app/lib/
COPY notification-service/target/quarkus-app/*.jar /app/
COPY notification-service/target/quarkus-app/app/ /app/app/
COPY notification-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]

