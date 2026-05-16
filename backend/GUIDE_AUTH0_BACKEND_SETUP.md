// backend/GUIDE_AUTH0_BACKEND_SETUP.md

# Guide: Intégration Auth0 côté Backend (Quarkus)

## 📋 Vue d'ensemble

Le backend Quarkus doit valider les tokens JWT envoyés par le frontend.

Flux:

1. Frontend envoie: `Authorization: Bearer <JWT_TOKEN>`
2. Backend extrait le token du header
3. Backend valide la signature avec la clé publique d'Auth0
4. Backend retourne les données protégées

---

## Installation des dépendances

Ajouter à `backend/pom.xml`:

```xml
<!-- Auth0 / JWT Validation -->
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-smallrye-jwt</artifactId>
</dependency>

<!-- CORS Support -->
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-smallrye-jwt-build</artifactId>
</dependency>
```

Ou via CLI:

```bash
./mvnw quarkus:add-extension -Dextensions="smallrye-jwt"
```

---

## Configuration Quarkus (application.yml ou .properties)

Ajouter à `backend/src/main/resources/application.yml`:

```yaml
quarkus:
  # =========================================================================
  # Configuration JWT (Auth0)
  # =========================================================================
  smallrye:
    jwt:
      # IMPORTANT: Doit correspondre à VITE_AUTH0_AUDIENCE côté frontend
      verify:
        audience: https://api.unigevents.ch

      # JWKS (JSON Web Key Set) endpoint d'Auth0
      # Format: https://{DOMAIN}/.well-known/jwks.json
      public-key: https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json

      # Algo de signature
      algorithm: RS256

      # Durée de cache des clés publiques (recommandé: 24 heures)
      jwks-cache-max-age: 86400

  # =========================================================================
  # Configuration CORS
  # =========================================================================
  http:
    cors:
      origins: "http://localhost:5173,https://yourdomain.com"
      methods: "GET,POST,PUT,DELETE,OPTIONS"
      headers: "Authorization,Content-Type"
      credentials: true
      max-age: 3600
```

Ou en `application.properties`:

```properties
# JWT Configuration
quarkus.smallrye.jwt.verify.audience=https://api.unigevents.ch
quarkus.smallrye.jwt.public-key=https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
quarkus.smallrye.jwt.algorithm=RS256
quarkus.smallrye.jwt.jwks-cache-max-age=86400

# CORS Configuration
quarkus.http.cors=true
quarkus.http.cors.origins=http://localhost:5173,https://yourdomain.com
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS
quarkus.http.cors.headers=Authorization,Content-Type
quarkus.http.cors.credentials=true
quarkus.http.cors.max-age=3600
```

Remplacer `YOUR_DOMAIN` par votre domaine Auth0 (ex: `myapp.auth0.com`)

---

## Exemple: Endpoint protégé par JWT

```java
// src/main/java/ch/unige/pinfo/user/resource/UserResource.java

package ch.unige.pinfo.user.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.jwt.Claims;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
public class UserResource {

  /**
   * Injecter le token JWT
   * Quarkus valide automatiquement la signature + audience
   */
  @Inject
  JsonWebToken jwt;

  /**
   * Endpoint sécurisé: Récupère le profil utilisateur
   *
   * Nécessite un header Authorization valide:
   *   Authorization: Bearer <JWT_TOKEN>
   *
   * La décoration @Authenticated assure que le token est valide
   * Si le token est invalide/expiré, Quarkus retourne 401
   */
  @GET
  @Path("/profile")
  @Authenticated
  public UserProfileResponse getProfile() {
    // Accéder aux données du token JWT
    String userId = jwt.getSubject();           // 'sub' claim
    String email = jwt.getClaim("email");       // 'email' claim
    String displayName = jwt.getClaim("name");  // 'name' claim
    String role = jwt.getClaim("https://pinfo.unige.ch/role");  // Custom claim

    // Retourner les données du profil utilisateur
    return UserProfileResponse.builder()
      .id(userId)
      .email(email)
      .displayName(displayName)
      .role(role != null ? role : "STUDENT")
      .build();
  }

  /**
   * Endpoint test: Vérifie que l'authentification fonctionne
   *
   * @return Confirme que le token est valide
   */
  @GET
  @Path("/auth/test")
  @Authenticated
  public AuthTestResponse testAuth() {
    return AuthTestResponse.builder()
      .authenticated(true)
      .userId(jwt.getSubject())
      .email(jwt.getClaim("email"))
      .build();
  }

  /**
   * Endpoint public: N'a pas besoin d'authentification
   * (IMPORTANT: Pas de @Authenticated)
   */
  @GET
  @Path("/health")
  public HealthResponse health() {
    return HealthResponse.builder()
      .status("ok")
      .timestamp(System.currentTimeMillis())
      .build();
  }
}
```

---

## Classes de réponse

```java
// src/main/java/ch/unige/pinfo/user/dto/UserProfileResponse.java

package ch.unige.pinfo.user.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
public class UserProfileResponse {
  private String id;
  private String email;
  private String displayName;
  private String role;
  private String avatar;
  private Long createdAt;
}
```

```java
// src/main/java/ch/unige/pinfo/user/dto/AuthTestResponse.java

package ch.unige.pinfo.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthTestResponse {
  private boolean authenticated;
  private String userId;
  private String email;
}
```

---

## Claims disponibles dans le token JWT

Depuis `JsonWebToken jwt`:

```java
// Standard claims
jwt.getSubject()        // 'sub' - User ID d'Auth0
jwt.getClaim("email")   // 'email' - Email de l'utilisateur
jwt.getClaim("name")    // 'name' - Nom complet
jwt.getClaim("picture") // 'picture' - Avatar URL

// Custom claims (si ajoutés dans Auth0 rules)
jwt.getClaim("https://pinfo.unige.ch/role")       // Rôle utilisateur
jwt.getClaim("https://pinfo.unige.ch/department") // Département

// Métadonnées du token
jwt.getExpirationTime() // Timestamp d'expiration
jwt.getIssuedAtTime()   // Timestamp d'émission
jwt.getIssuer()         // 'iss' - Émetteur (Auth0 domain)
jwt.getAudience()       // 'aud' - Audience (notre API)
```

---

## Gestion des erreurs JWT

Quarkus retourne automatiquement:

- **401 Unauthorized**: Token invalide, expiré, ou absent
- **403 Forbidden**: Token valide mais audience ne correspond pas
- **400 Bad Request**: Token malformé

Personnaliser la réponse d'erreur:

```java
// src/main/java/ch/unige/pinfo/common/exception/JwtExceptionHandler.java

import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import jakarta.ws.rs.core.Response;
import io.quarkus.security.UnauthorizedException;

@Provider
public class JwtExceptionHandler implements ExceptionMapper<UnauthorizedException> {

  @Override
  public Response toResponse(UnauthorizedException exception) {
    ErrorResponse error = ErrorResponse.builder()
      .status(401)
      .message("Token invalide ou expiré")
      .error("UNAUTHORIZED")
      .build();

    return Response
      .status(Response.Status.UNAUTHORIZED)
      .entity(error)
      .build();
  }
}
```

---

## Test avec curl

```bash
# 1. Obtenir un token Auth0 (via votre auth endpoint ou Auth0 dashboard)
TOKEN="eyJhbGc..."

# 2. Test endpoint sécurisé
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8081/api/users/profile

# 3. Test sans token (doit retourner 401)
curl http://localhost:8081/api/users/profile
# → Erreur 401

# 4. Test endpoint public (pas besoin de token)
curl http://localhost:8081/api/users/health
# → { "status": "ok" }
```

---

## Configuration par microservice

Si chaque microservice Quarkus utilise Auth0:

**user-service/src/main/resources/application.yml**

```yaml
quarkus:
  smallrye:
    jwt:
      verify:
        audience: https://api.unigevents.ch
      public-key: https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
```

**event-service/src/main/resources/application.yml**

```yaml
quarkus:
  smallrye:
    jwt:
      verify:
        audience: https://api.unigevents.ch
      public-key: https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
```

_Même audience pour tous les microservices_ (assure la compatibilité)

---

## Intégration avec Kong (API Gateway)

Si vous utilisez Kong comme proxy:

```yaml
# kong/kong.yml

plugins:
  - name: jwt
    config:
      key_claim_name: sub
      secret_is_base64: false
      algorithms: ["HS256", "RS256"]

# Kong valide le JWT AVANT de le passer aux microservices
```

---

## Bonnes pratiques sécurité

✅ DO:

- Valider la signature JWT (Quarkus le fait automatiquement)
- Vérifier l'audience (`aud` claim)
- Vérifier l'expiration (`exp` claim)
- Utiliser HTTPS en production
- Renouveler les clés publiques régulièrement (cache 24h)

❌ DON'T:

- Ne pas désactiver la validation JWT
- Ne pas accepter les tokens de n'importe quelle source
- Ne pas exposer les erreurs JWT en détail (401 is OK, pas besoin de details)
- Ne pas stocker les secrets côté client

---

## Dépannage

### ❌ "401 Unauthorized" sur tous les appels

Vérifier:

1. Token est présent dans le header `Authorization: Bearer <token>`
2. Token n'est pas expiré
3. `VITE_AUTH0_AUDIENCE` (frontend) = `quarkus.smallrye.jwt.verify.audience` (backend)

### ❌ "Cannot resolve public key"

Vérifier:

1. URL JWKS est correcte: `https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json`
2. Auth0 domain est accessible depuis le backend
3. Réseau ne bloque pas la requête

### ❌ CORS errors

Ajouter à configuration:

```yaml
quarkus:
  http:
    cors: true
    cors:
      origins: "http://localhost:5173"
```

---

## Exemple complet du workflow

1. **Frontend (Vite + React)**

   ```javascript
   const token = await getAccessTokenSilently();
   fetch("/api/users/profile", {
     headers: { Authorization: `Bearer ${token}` },
   });
   ```

2. **Interception Axios**
   - Axios ajoute automatiquement le Bearer token

3. **Backend reçoit la requête**

   ```
   GET /api/users/profile HTTP/1.1
   Authorization: Bearer eyJhbGc...
   ```

4. **Quarkus valide le token**
   - Extrait le token du header
   - Valide la signature avec clé publique Auth0
   - Vérifie l'audience
   - Vérifie l'expiration
   - ✅ Valide → continue
   - ❌ Invalide → retourne 401

5. **Endpoint retourne les données**
   ```json
   {
     "id": "auth0|...",
     "email": "user@example.com",
     "displayName": "John Doe",
     "role": "STUDENT"
   }
   ```

---

## Ressources

- **Auth0 Quarkus**: https://quarkus.io/guides/security-jwt
- **MicroProfile JWT**: https://microprofile.io/project/microprofile-jwt-auth
- **Quarkus Security**: https://quarkus.io/guides/security

---

Generated: 2026-05-02
Last Updated: Quarkus 3.34.6, Auth0 standard
