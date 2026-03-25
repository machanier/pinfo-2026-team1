FROM eclipse-temurin:17-jre
WORKDIR /app
COPY registration-service/target/quarkus-app/lib/ /app/lib/
COPY registration-service/target/quarkus-app/*.jar /app/
COPY registration-service/target/quarkus-app/app/ /app/app/
COPY registration-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
