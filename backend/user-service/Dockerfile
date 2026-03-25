FROM eclipse-temurin:17-jre
WORKDIR /app
COPY user-service/target/quarkus-app/lib/ /app/lib/
COPY user-service/target/quarkus-app/*.jar /app/
COPY user-service/target/quarkus-app/app/ /app/app/
COPY user-service/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
