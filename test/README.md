# Tests UI / E2E — Karate

Module **autonome** (son propre `pom.xml`, hors du build `backend/`) qui rejoue le
parcours d'un vrai utilisateur dans un **navigateur** pour vérifier que le site
fonctionne de bout en bout :

| Feature | Ce qu'elle fait | Modifie des données ? |
|---|---|---|
| [`ui/browser-login.feature`](ui/browser-login.feature) | Login STUDENT / ORGANIZER / ADMIN, vérifie la navbar | Non (lecture seule) |
| [`ui/event-creation.feature`](ui/event-creation.feature) | Login orga → crée **et publie** un événement, vérifie l'affichage | **Oui** : crée un événement (bloqué en prod, cf. plus bas) |

> ℹ️ **Karate** = l'outil de test (pas **Kafka**, le broker du projet). Rien ici
> ne touche Kafka ni la prod.

---

## Le modèle de comptes (important)

Karate est comme un **cascadeur** : il sait conduire le site, mais pour jouer la
scène « connexion » il faut lui prêter **les clés d'un vrai compte**. Il n'y a
donc **pas d'identifiant « Karate »** — il te faut **les comptes de test Auth0**
(email + mot de passe) qu'il va taper dans la page de login :

- un compte **STUDENT**, un **ORGANIZER**, un **ADMIN** (selon ce que tu lances).
- Ces comptes doivent exister dans le tenant Auth0 avec le bon rôle.

Les **emails** peuvent venir de Doppler (`TEST_*_EMAIL`) ou de [`dev.json`](dev.json).
Les **mots de passe**, eux, se fournissent de deux façons :

### Option A — Doppler en clair (recommandé)

Tu as déjà Doppler : mets-y simplement les mots de passe **en clair**, pas besoin
de chiffrer quoi que ce soit.

| Variable Doppler / env | Rôle |
|---|---|
| `TEST_ORGANIZER_EMAIL` | email du compte orga |
| `TEST_STUDENT_EMAIL` | email du compte étudiant |
| `TEST_ADMIN_EMAIL` | email du compte admin |
| `TEST_ORGANIZER_PASSWORD` | mot de passe du compte orga |
| `TEST_STUDENT_PASSWORD` | mot de passe du compte étudiant |
| `TEST_ADMIN_PASSWORD` | mot de passe du compte admin |
| `AUTH0_CLIENT_ID` | *(optionnel, seulement pour le flow token API)* |

Puis on lance avec `doppler run -- …` (voir plus bas). La config prend ces
variables en priorité.

### Option B — chiffré dans le JSON (sans Doppler)

Sans coffre, on évite d'écrire les mots de passe en clair dans le repo : on les
chiffre (AES) une fois, et on colle le résultat dans `dev.json`.

```bash
cd test
# édite d'abord util/encrypt-credentials.feature: mets le vrai email + mot de passe
mvn test -Dkarate.options="classpath:util/encrypt-credentials.feature"
# copie chaque "ENC >>> ..." dans le champ *PasswordEnc correspondant de dev.json
```

> ⚠️ Ce chiffrement est **faible** (la clé de déchiffrement est l'email, stocké
> juste à côté). Ne committe **jamais** un `dev.json` rempli de vraies valeurs :
> édite-le en local sans le `git add`, ou utilise l'option A.

---

## Prérequis

- **Java 21** + **Maven**
- **L'app web doit tourner** (c'est là que le navigateur va) :
  - **Frontend** — recommandé : `cd frontend && npm run dev` → Vite sur
    **http://localhost:5173** (déjà câblé Auth0 via Doppler, toujours à jour) ;
    c'est le **défaut** d'`appUrl`. *Alternative* : la stack dockerisée sert le
    frontend sur **http://localhost:3000** → ajoute `-DappUrl=http://localhost:3000`.
  - **Backend** — les services doivent répondre (login, création d'événement).
    Pour la stack dockerisée, **empaquette d'abord** (les Dockerfiles *copient* des
    jars déjà compilés, ils ne compilent pas), puis démarre :
    ```bash
    cd backend && ./mvnw package -DskipTests
    docker compose -f docker/docker-compose.yml --profile fullstack up -d
    ```
  - ⚠️ **Kong (`:8000`) ne sert que l'API** (`/api/*`), jamais le site React — ne le
    vise jamais comme `appUrl`.
- **Un navigateur** (tu es sur Mac) :
  - **Chrome** (le plus simple) : `-DbrowserType=chrome`
  - **Safari** : `-DbrowserType=safaridriver`, après avoir activé l'automation :
    `sudo safaridriver --enable` (ou Safari → menu *Développement* → *Autoriser
    l'automatisation à distance*). Safari ne fait **pas** de headless → la fenêtre
    s'ouvre toujours (la config force `headless=false` pour Safari).
  - **Firefox** (défaut) : nécessite geckodriver → `brew install geckodriver`

---

## Lancer les tests

```bash
cd test

# Frontend en Vite (:5173, le défaut), Chrome visible, secrets Doppler :
doppler run -- mvn test -Dkarate.env=dev -DbrowserType=chrome -Dheadless=false

# Si le frontend tourne dans Docker (:3000) au lieu de Vite :
doppler run -- mvn test -Dkarate.env=dev -DbrowserType=chrome -DappUrl=http://localhost:3000

# Safari (Mac) au lieu de Chrome :
doppler run -- mvn test -Dkarate.env=dev -DbrowserType=safaridriver

# Un seul scénario (login uniquement) :
doppler run -- mvn test -Dkarate.options="classpath:ui/browser-login.feature"
```

**Rapport** généré après coup (fichier HTML local, ne modifie rien) :
`test/target/karate-reports/karate-summary.html`.

---

## Sécurité / ce que ça touche

| Action | Touche quoi |
|---|---|
| Merger ce module | **Rien** (code inerte, hors CI et hors build backend) |
| Générer / ouvrir le rapport | **Rien** (fichier HTML local) |
| `browser-login` | **Rien** côté données (lecture seule) |
| `event-creation` en **dev local** | crée un événement dans **ta** base locale (jetable) |
| `event-creation` en **prod** | **bloqué** : `karate.abort()` si `-Dkarate.env=prod` |

Autrement dit : lancé en **dev local** (le défaut), rien n'est touché côté
prod/cluster — seulement ta machine.

---

## Environnements

| `-Dkarate.env=` | `appUrl` par défaut |
|---|---|
| `dev` (défaut) | `http://localhost:5173` (Vite ; ou `:3000` si frontend dockerisé) |
| `prod` | `https://pinfo1.p-info.net` (override possible via `PROD_BASE_URL`) |

---

## Maintenance

Les sélecteurs CSS/texte sont dans [`ui/locators.json`](ui/locators.json) et reflètent
l'UI **actuelle**. Si le frontend évolue (libellés de boutons, structure du formulaire
d'événement, flow de login…), il faut mettre à jour `locators.json` en conséquence —
sinon une étape `waitFor(...)` échouera. C'est le coût normal d'un test UI.
