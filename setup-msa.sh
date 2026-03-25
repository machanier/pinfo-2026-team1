#!/bin/bash

# =============================================================================
# Script de migration vers MSA - unigEvents
# Usage: bash setup-msa.sh (depuis la racine du repo git)
# =============================================================================

set -e

GROUP_ID="ch.unige.pinfo"
QUARKUS_VERSION="3.32.2"
JAVA_VERSION="17"
SERVICES=("user" "event" "notification" "moderation" "search" "registration")

echo "🚀 Création de l'architecture MSA unigEvents..."

# =============================================================================
# 1. STRUCTURE DE BASE
# =============================================================================
mkdir -p frontend
mkdir -p backend

# =============================================================================
# 2. POM PARENT
# =============================================================================
cat > backend/pom.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>ch.unige.pinfo</groupId>
    <artifactId>unigEvents-backend</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <modules>
        <module>user-service</module>
        <module>event-service</module>
        <module>notification-service</module>
        <module>moderation-service</module>
        <module>search-service</module>
        <module>registration-service</module>
    </modules>

    <properties>
        <compiler-plugin.version>3.15.0</compiler-plugin.version>
        <maven.compiler.release>17</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <quarkus.platform.artifact-id>quarkus-bom</quarkus.platform.artifact-id>
        <quarkus.platform.group-id>io.quarkus.platform</quarkus.platform.group-id>
        <quarkus.platform.version>3.32.2</quarkus.platform.version>
        <skipITs>true</skipITs>
        <surefire-plugin.version>3.5.4</surefire-plugin.version>
        <!-- SonarCloud -->
        <sonar.organization>machanier</sonar.organization>
        <sonar.host.url>https://sonarcloud.io</sonar.host.url>
        <sonar.projectKey>machanier_pinfo-2026-team1</sonar.projectKey>
        <sonar.coverage.jacoco.xmlReportPaths>${project.build.directory}/jacoco-report/jacoco.xml</sonar.coverage.jacoco.xmlReportPaths>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>${quarkus.platform.group-id}</groupId>
                <artifactId>${quarkus.platform.artifact-id}</artifactId>
                <version>${quarkus.platform.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>${quarkus.platform.group-id}</groupId>
                    <artifactId>quarkus-maven-plugin</artifactId>
                    <version>${quarkus.platform.version}</version>
                    <extensions>true</extensions>
                    <executions>
                        <execution>
                            <goals>
                                <goal>build</goal>
                                <goal>generate-code</goal>
                                <goal>generate-code-tests</goal>
                                <goal>native-image-agent</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
                <plugin>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>${compiler-plugin.version}</version>
                    <configuration>
                        <parameters>true</parameters>
                    </configuration>
                </plugin>
                <plugin>
                    <artifactId>maven-surefire-plugin</artifactId>
                    <version>${surefire-plugin.version}</version>
                    <configuration>
                        <systemPropertyVariables>
                            <java.util.logging.manager>org.jboss.logmanager.LogManager</java.util.logging.manager>
                            <maven.home>${maven.home}</maven.home>
                        </systemPropertyVariables>
                    </configuration>
                </plugin>
                <plugin>
                    <artifactId>maven-failsafe-plugin</artifactId>
                    <version>${surefire-plugin.version}</version>
                    <executions>
                        <execution>
                            <goals>
                                <goal>integration-test</goal>
                                <goal>verify</goal>
                            </goals>
                        </execution>
                    </executions>
                    <configuration>
                        <systemPropertyVariables>
                            <native.image.path>${project.build.directory}/${project.build.finalName}-runner</native.image.path>
                            <java.util.logging.manager>org.jboss.logmanager.LogManager</java.util.logging.manager>
                            <maven.home>${maven.home}</maven.home>
                        </systemPropertyVariables>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.jacoco</groupId>
                    <artifactId>jacoco-maven-plugin</artifactId>
                    <version>0.8.12</version>
                    <executions>
                        <execution>
                            <id>prepare-agent</id>
                            <goals><goal>prepare-agent</goal></goals>
                        </execution>
                        <execution>
                            <id>report</id>
                            <phase>test</phase>
                            <goals><goal>report</goal></goals>
                            <configuration>
                                <outputDirectory>${project.build.directory}/jacoco-report</outputDirectory>
                            </configuration>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>

    <profiles>
        <profile>
            <id>native</id>
            <activation>
                <property>
                    <name>native</name>
                </property>
            </activation>
            <properties>
                <skipITs>false</skipITs>
                <quarkus.native.enabled>true</quarkus.native.enabled>
            </properties>
        </profile>
    </profiles>
</project>
EOF

echo "✅ pom.xml parent créé"

# =============================================================================
# 3. CRÉATION DE CHAQUE SERVICE
# =============================================================================

# Dépendances spécifiques par service
declare -A EXTRA_DEPS
EXTRA_DEPS["user"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-oidc</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-jwt</artifactId>
        </dependency>'

EXTRA_DEPS["event"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-openapi</artifactId>
        </dependency>'

EXTRA_DEPS["notification"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-reactive-messaging</artifactId>
        </dependency>'

EXTRA_DEPS["moderation"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-jwt</artifactId>
        </dependency>'

EXTRA_DEPS["search"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-hibernate-search-orm-elasticsearch</artifactId>
        </dependency>'

EXTRA_DEPS["registration"]='
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-openapi</artifactId>
        </dependency>'

# Ports par service (éviter les conflits)
declare -A SERVICE_PORTS
SERVICE_PORTS["user"]="8081"
SERVICE_PORTS["event"]="8082"
SERVICE_PORTS["notification"]="8083"
SERVICE_PORTS["moderation"]="8084"
SERVICE_PORTS["search"]="8085"
SERVICE_PORTS["registration"]="8086"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="backend/${SERVICE}-service"
    PACKAGE_PATH="ch/unige/pinfo/${SERVICE}"
    PACKAGE_NAME="ch.unige.pinfo.${SERVICE}"
    ARTIFACT_ID="unigEvents-${SERVICE}-service"
    PORT=${SERVICE_PORTS[$SERVICE]}

    echo "📦 Création de ${SERVICE}-service..."

    # Arborescence
    mkdir -p "${SERVICE_DIR}/src/main/java/${PACKAGE_PATH}/resource"
    mkdir -p "${SERVICE_DIR}/src/main/java/${PACKAGE_PATH}/service"
    mkdir -p "${SERVICE_DIR}/src/main/java/${PACKAGE_PATH}/repository"
    mkdir -p "${SERVICE_DIR}/src/main/java/${PACKAGE_PATH}/model"
    mkdir -p "${SERVICE_DIR}/src/main/java/${PACKAGE_PATH}/dto"
    mkdir -p "${SERVICE_DIR}/src/main/resources"
    mkdir -p "${SERVICE_DIR}/src/test/java/${PACKAGE_PATH}"

    # -------------------------------------------------------------------------
    # pom.xml du service
    # -------------------------------------------------------------------------
    cat > "${SERVICE_DIR}/pom.xml" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>ch.unige.pinfo</groupId>
        <artifactId>unigEvents-backend</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>${ARTIFACT_ID}</artifactId>

    <dependencies>
        <!-- Core Quarkus -->
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-arc</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-rest</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-rest-jackson</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-hibernate-orm-panache</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-hibernate-orm</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-jdbc-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-hibernate-validator</artifactId>
        </dependency>${EXTRA_DEPS[$SERVICE]}

        <!-- Tests -->
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-junit</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.rest-assured</groupId>
            <artifactId>rest-assured</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>\${quarkus.platform.group-id}</groupId>
                <artifactId>quarkus-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <artifactId>maven-compiler-plugin</artifactId>
            </plugin>
            <plugin>
                <artifactId>maven-surefire-plugin</artifactId>
            </plugin>
            <plugin>
                <artifactId>maven-failsafe-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
EOF

    # -------------------------------------------------------------------------
    # application.properties
    # -------------------------------------------------------------------------
    cat > "${SERVICE_DIR}/src/main/resources/application.properties" << EOF
# === ${SERVICE}-service ===
quarkus.http.port=${PORT}
quarkus.application.name=${SERVICE}-service

# DataSource (à adapter par environnement)
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=\${DB_USER:postgres}
quarkus.datasource.password=\${DB_PASSWORD:postgres}
quarkus.datasource.jdbc.url=\${DB_URL:jdbc:postgresql://localhost:5432/unigevents_${SERVICE}}

# Hibernate
quarkus.hibernate-orm.database.generation=update
quarkus.hibernate-orm.log.sql=false

# Log
quarkus.log.level=INFO
EOF

    # -------------------------------------------------------------------------
    # Dockerfile
    # -------------------------------------------------------------------------
    cat > "${SERVICE_DIR}/Dockerfile" << 'EOF'
# ---- Build ----
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests -pl . --no-transfer-progress

# ---- Run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/quarkus-app/lib/ /app/lib/
COPY --from=build /app/target/quarkus-app/*.jar /app/
COPY --from=build /app/target/quarkus-app/app/ /app/app/
COPY --from=build /app/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
EOF

    echo "  ✅ ${SERVICE}-service créé (port ${PORT})"
done

# =============================================================================
# 4. DOCKER-COMPOSE GLOBAL
# =============================================================================
cat > docker-compose.yml << 'EOF'
version: '3.9'

services:

  # ── Databases ──────────────────────────────────────────────────────────────
  postgres-user:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_user
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]

  postgres-event:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_event
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5433:5432"]

  postgres-notification:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_notification
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5434:5432"]

  postgres-moderation:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_moderation
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5435:5432"]

  postgres-search:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_search
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5436:5432"]

  postgres-registration:
    image: postgres:16
    environment:
      POSTGRES_DB: unigevents_registration
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5437:5432"]

  # ── Services ───────────────────────────────────────────────────────────────
  user-service:
    build: ./backend/user-service
    ports: ["8081:8081"]
    environment:
      DB_URL: jdbc:postgresql://postgres-user:5432/unigevents_user
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-user]

  event-service:
    build: ./backend/event-service
    ports: ["8082:8082"]
    environment:
      DB_URL: jdbc:postgresql://postgres-event:5432/unigevents_event
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-event]

  notification-service:
    build: ./backend/notification-service
    ports: ["8083:8083"]
    environment:
      DB_URL: jdbc:postgresql://postgres-notification:5432/unigevents_notification
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-notification]

  moderation-service:
    build: ./backend/moderation-service
    ports: ["8084:8084"]
    environment:
      DB_URL: jdbc:postgresql://postgres-moderation:5432/unigevents_moderation
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-moderation]

  search-service:
    build: ./backend/search-service
    ports: ["8085:8085"]
    environment:
      DB_URL: jdbc:postgresql://postgres-search:5432/unigevents_search
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-search]

  registration-service:
    build: ./backend/registration-service
    ports: ["8086:8086"]
    environment:
      DB_URL: jdbc:postgresql://postgres-registration:5432/unigevents_registration
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on: [postgres-registration]

  # ── Frontend ───────────────────────────────────────────────────────────────
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
EOF

echo "✅ docker-compose.yml créé"

# =============================================================================
# 5. .gitignore global (si pas déjà présent)
# =============================================================================
if [ ! -f .gitignore ]; then
cat > .gitignore << 'EOF'
# Maven
target/
*.class
*.jar
!**/src/main/**
!**/src/test/**

# Quarkus
.quarkus/

# IDE
.idea/
*.iml
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Env
.env
EOF
echo "✅ .gitignore créé"
fi

# =============================================================================
# RÉSUMÉ
# =============================================================================
echo ""
echo "════════════════════════════════════════════════════"
echo "✅  Architecture MSA créée avec succès !"
echo "════════════════════════════════════════════════════"
echo ""
echo "📁 Structure :"
echo "  backend/"
for SERVICE in "${SERVICES[@]}"; do
  echo "  ├── ${SERVICE}-service/   (port ${SERVICE_PORTS[$SERVICE]})"
done
echo "  frontend/"
echo "  docker-compose.yml"
echo ""
echo "📦 Packages Java : ch.unige.pinfo.<service>"
echo ""
echo "▶️  Prochaines étapes :"
echo "  1. Supprimer l'ancien src/ du repo"
echo "  2. cd backend && mvn clean install -DskipTests"
echo "  3. docker-compose up --build"
echo ""