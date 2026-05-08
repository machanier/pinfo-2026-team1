// QUICK_START_AUTH0.md

# 🚀 Quick Start - Auth0 Integration

Suivez cette checklist pour mettre en place Auth0 rapidement.

## ✅ 5 minutes - Setup Initial

### 1. Créer un compte Auth0

- [ ] Aller à https://auth0.com
- [ ] Créer un compte (gratuit)
- [ ] Dashboard → Create Tenant

### 2. Créer l'Application (Single Page App)

- [ ] Dashboard → Applications → Create Application
- [ ] Name: "UniEvents" (ou votre nom)
- [ ] Type: **Single Page Application**
- [ ] Framework: **React**
- [ ] Continuer et prendre note des credentials

### 3. Configurer les URLs

- [ ] Settings → Application URIs
- [ ] Application Login URI: `http://localhost:5173`
- [ ] Callback URLs: `http://localhost:5173`
- [ ] Logout URLs: `http://localhost:5173`
- [ ] Allowed Web Origins: `http://localhost:5173`

### 4. Créer l'API (pour votre backend)

- [ ] Dashboard → APIs → Create API
- [ ] Name: "UniEvents API"
- [ ] Identifier: `https://api.unigevents.ch`
- [ ] Signing Algorithm: **RS256**
- [ ] Prendre note du **Identifier** (c'est votre AUDIENCE)

---

## 📝 Configuration Frontend (15 min)

### Étape 1: Créer `.env.local`

```bash
cd /workspace/frontend
cat > .env.local << 'EOF'
VITE_AUTH0_DOMAIN=YOUR_DOMAIN.auth0.com
VITE_AUTH0_CLIENT_ID=YOUR_CLIENT_ID
VITE_AUTH0_AUDIENCE=https://api.unigevents.ch
VITE_API_URL=http://localhost:8081
VITE_API_TIMEOUT=30000
EOF
```

Remplacer:

- `YOUR_DOMAIN` par votre domaine Auth0 (ex: `myapp` si `myapp.auth0.com`)
- `YOUR_CLIENT_ID` par le Client ID de votre app

### Étape 2: Installer les dépendances

```bash
npm install @auth0/auth0-react axios
```

### Étape 3: Vérifier les fichiers

```bash
# Vérifier que les fichiers existent:
ls -la src/main.jsx          # ✓ Auth0Provider
ls -la src/contexts/AppContext.jsx  # ✓ useAuth0()
ls -la src/lib/api.js        # ✓ Interceptor
ls -la src/hooks/useApi.js   # ✓ Hook
ls -la src/lib/apiServices.js  # ✓ Services
ls -la src/pages/LoginPage.jsx  # ✓ Login page
```

### Étape 4: Démarrer l'app

```bash
npm run dev
# → http://localhost:5173
```

### Étape 5: Tester le login

1. Aller à http://localhost:5173/login
2. Cliquer "Se connecter avec Auth0"
3. Se connecter avec un compte (ou en créer un)
4. Être redirigé vers /profile
5. ✅ Login fonctionne !

---

## 🔧 Configuration Backend (15 min)

### Étape 1: Configuration Quarkus

Ajouter à `backend/src/main/resources/application.yml`:

```yaml
quarkus:
  # JWT Config
  smallrye:
    jwt:
      verify:
        audience: https://api.unigevents.ch
      public-key: https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
      algorithm: RS256

  # CORS Config
  http:
    cors: true
    cors:
      origins: http://localhost:5173
      methods: GET,POST,PUT,DELETE,OPTIONS
      headers: Authorization,Content-Type
      credentials: true
```

### Étape 2: Ajouter l'intercepteur dans un endpoint

```java
package ch.unige.pinfo.user.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.jwt.JsonWebToken;
import jakarta.inject.Inject;

@Path("/api/users")
public class UserResource {

  @Inject
  JsonWebToken jwt;

  @GET
  @Path("/profile")
  @Authenticated
  @Produces(MediaType.APPLICATION_JSON)
  public UserProfile getProfile() {
    return UserProfile.builder()
      .id(jwt.getSubject())
      .email(jwt.getClaim("email"))
      .displayName(jwt.getClaim("name"))
      .build();
  }

  @GET
  @Path("/health")
  @Produces(MediaType.APPLICATION_JSON)
  public Health health() {
    return Health.builder().status("ok").build();
  }
}
```

### Étape 3: Démarrer le backend

```bash
cd /workspace/backend
./mvnw quarkus:dev
# → http://localhost:8081
```

---

## ✅ Tests de Vérification

### Test 1: Frontend lance sans erreurs

```bash
# Terminal 1
cd /workspace/frontend && npm run dev

# DevTools Console → Aucune erreur rouge
```

### Test 2: Backend accepte les tokens

```bash
# Terminal 2
cd /workspace/backend && ./mvnw quarkus:dev

# Logs → "Profile retrieval successful" ou similaire
```

### Test 3: Flow complet d'authentification

1. Aller à http://localhost:5173/login
2. Cliquer "Se connecter avec Auth0"
3. Compléter l'authentification
4. Être redirigé vers /profile
5. DevTools Network → Voir les requêtes avec header `Authorization: Bearer`
6. ✅ Tous les tests passent !

### Test 4: Via curl

```bash
# 1. Obtenir un token (depuis votre Auth0 ou via login)
TOKEN="eyJhbGc..."

# 2. Appeler l'API
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8081/api/users/profile

# Réponse: { "id": "...", "email": "...", "displayName": "..." }
# ✅ Backend JWT validation fonctionne !
```

---

## 🐛 Troubleshooting Rapide

| Problème                 | Cause                  | Solution                         |
| ------------------------ | ---------------------- | -------------------------------- |
| "Cannot read useAuth0"   | Auth0Provider manquant | Vérifier `main.jsx`              |
| "401 Unauthorized"       | Token pas attaché      | Vérifier `api.js` interceptor    |
| "Token audience invalid" | Audience ne match pas  | Vérifier VITE_AUTH0_AUDIENCE     |
| CORS error               | Origins pas autorisé   | Ajouter `localhost:5173` en CORS |
| Login boucle             | useEffect manquant     | Vérifier `LoginPage.jsx`         |

---

## 📚 Documentation Complète

Voir:

- `frontend/GUIDE_AUTH0_INTEGRATION.md` → Configuration détaillée
- `backend/GUIDE_AUTH0_BACKEND_SETUP.md` → Setup Quarkus
- `frontend/INTEGRATION_AUTH0_SUMMARY.md` → Récapitulatif complet

---

## 🎯 Prochaines étapes (Production)

- [ ] Configurer HTTPS
- [ ] Ajouter les rôles utilisateur (custom claims)
- [ ] Tester l'expiration des tokens
- [ ] Ajouter les logs de sécurité
- [ ] Configurer les URLs de production
- [ ] Tests end-to-end

---

## ⏱️ Temps estimé

- Setup Auth0: **5 min**
- Frontend: **15 min**
- Backend: **15 min**
- Tests: **10 min**
- **Total: ~45 minutes**

Bonne chance ! 🚀

---

Questions? Voir la documentation complète ou les fichiers GUIDE\_\*.md
