# Modifications Backend Detaillees (Pourquoi et Comment)

## Objectif du document

Ce document recense precisement les changements appliques au backend pour stabiliser l'edition de profil, fiabiliser la synchronisation utilisateur JWT, corriger les erreurs 404/500 observees en frontend, et reduire les effets de boucle lors des appels API.

Perimetre traite:

- Service concerne: user-service
- API concernees: /api/users/{userId}, /api/users/{userId}/student-profile, /api/users/{userId}/association-profile, /api/users/me

---

## 1) Correction du profil association pour organisateur legacy

### Fichier

- backend/user-service/src/main/java/ch/unige/pinfo/user/resource/AssociationResource.java

### Probleme initial

Des comptes organisateur existants pouvaient etre presents uniquement dans la table users, sans ligne correspondante dans la table association (inheritance JOINED). Dans ce cas:

- GET /api/users/{id}/association-profile renvoyait 404
- PUT /api/users/{id}/association-profile renvoyait 404

Ce cas cassait l'edition de profil organisateur cote frontend.

### Pourquoi ce changement

Le role ORGANIZER dans users ne garantit pas qu'une ligne existe deja dans association. Il fallait rendre l'API tolerante aux comptes legacy provisionnes avant la stabilisation du modele.

### Comment c'est implemente

1. Injection de EntityManager dans la ressource.
2. Ajout de @Transactional sur le GET association-profile pour autoriser les operations DB dans ce flux.
3. Mise a jour du controle d'autorisation sur PUT:
   - Roles autorises: Organizer, Admin
   - Ancien role incorrect supprime.
4. Dans getAssociationOrThrow:
   - Charger l'utilisateur base users.
   - Si deja instance Association, retour immediat.
   - Sinon, si role organizer + utilisateur proprietaire du token JWT:
     - Inserer une ligne minimale dans association via SQL natif:
       INSERT INTO association (id, description) VALUES (?1, ?2) ON CONFLICT (id) DO NOTHING
   - Forcer flush + clear du contexte de persistance.
   - Recharger explicitement l'entite Association via entityManager.find.
   - Si trouvee, retour.
   - Sinon, 404 final.

### Impact fonctionnel

- Un organisateur legacy peut recuperer et mettre a jour son profil association sans migration manuelle prealable.
- La relecture explicite evite les faux 404 lies au cache de premier niveau JPA.

### Limites et garde-fous

- Le backfill est limite au proprietaire (auth0Id == subject JWT) et role organizer.
- Aucun backfill automatique pour un utilisateur non proprietaire.

---

## 2) Persistance avatar utilisateur + serialisation defensive

### Fichier

- backend/user-service/src/main/java/ch/unige/pinfo/user/resource/UserResource.java

### Probleme initial

1. L'avatar pouvait ne pas etre persiste de maniere robuste lors du PUT utilisateur.
2. Des valeurs avatar_url invalides ou enormes (data URL tres longues) pouvaient provoquer des reponses instables cote proxy/navigateur (symptome observe: incomplete chunked encoding).

### Pourquoi ce changement

L'avatar est envoye cote frontend sous forme de data URL en base64. Ce format peut devenir tres volumineux. Sans garde-fou de taille et de validite URI, la serialisation/reponse peut devenir fragile.

### Comment c'est implemente

1. Dans apiUsersUserIdPut:
   - ecriture explicite de user.avatarUrl depuis req.avatarUrl.
2. Dans toResponse:
   - remplacement de la creation URI directe par safeAvatarUri.
3. Nouvelle methode safeAvatarUri:
   - null si vide
   - null si data: et longueur > 32768
   - tentative URI.create sinon
   - null si IllegalArgumentException

### Impact fonctionnel

- Le nom et l'avatar sont correctement persistes par le PUT utilisateur.
- Les valeurs avatar dangereuses ou trop lourdes ne cassent plus la reponse API.

### Trade-off

- Si avatar data URL depasse le seuil, il n'est pas renvoye dans la reponse (null), meme s'il reste stocke.

---

## 3) Endpoint identite courante deterministic

### Fichier

- backend/user-service/src/main/java/ch/unige/pinfo/user/resource/CurrentUserResource.java

### Probleme initial

Le frontend avait besoin d'un mapping fiable token JWT -> utilisateur local (UUID interne) pour charger et modifier le bon profil, sans heuristique locale fragile.

### Pourquoi ce changement

Un endpoint me simplifie la resolution de l'identite et reduit les erreurs de routage vers /api/users/{id} lorsque le bon id n'est pas encore hydrate dans le contexte client.

### Comment c'est implemente

1. Nouveau endpoint GET /api/users/me
2. Roles autorises: Student, Organizer, Admin
3. Transaction active.
4. Appel systematique userSyncService.syncUser() avant lecture.
5. Validation du subject JWT.
6. Recherche User par auth0Id.
7. Retour UserResponse via toResponse + safeAvatarUri.

### Impact fonctionnel

- Le frontend peut hydrater currentUserId de maniere deterministe.
- Le profil charge correspond a l'utilisateur authentifie reel.

---

## 4) Durcissement JIT provisioning depuis JWT

### Fichier

- backend/user-service/src/main/java/ch/unige/pinfo/user/service/UserSyncService.java

### Probleme initial

Lors de la creation JIT d'un compte student, les colonnes obligatoires du subtype Student pouvaient etre absentes, entrainant des erreurs de persistence.
De plus, certaines claims JWT pouvaient etre manquantes (name/email), cassant la creation locale.

### Pourquoi ce changement

La synchro JWT doit etre resiliente a la variabilite des claims Auth0 et au schema relationnel avec contraintes non nulles.

### Comment c'est implemente

1. Detection role student via isStudentRole (case-insensitive).
2. Si student:
   - instanciation Student
   - valeurs par defaut obligatoires:
     - faculty = TO_BE_DEFINED
     - major = TO_BE_DEFINED
     - degreeLevel = BACHELOR
3. Resolution robuste du displayName:
   - name -> nickname -> preferred_username -> prefix email -> auth0Id
4. Resolution robuste de l'email:
   - email -> preferred_username si email-like -> fallback genere depuis auth0Id
5. Harmonisation valeur role par defaut:
   - Student (au lieu de STUDENT en fallback direct de la methode)

### Impact fonctionnel

- Reduction forte des echecs de provisioning utilisateur a la premiere requete authentifiee.
- Moins de 500 lors des premieres navigations frontend apres login reel.

### Limite

- Les valeurs TO_BE_DEFINED necessitent ensuite une mise a jour profile par l'utilisateur.

---

## 5) Evolution schema avatar_url

### Fichiers

- backend/user-service/src/main/java/ch/unige/pinfo/user/model/User.java
- backend/user-service/src/main/java/ch/unige/pinfo/user/service/AvatarUrlSchemaMigrator.java

### Probleme initial

Le champ avatarUrl pouvait etre mappe sur un type SQL trop court pour les data URL base64 volumineuses.

### Pourquoi ce changement

Eviter la troncature ou les erreurs SQL lors du stockage de payload avatar important.

### Comment c'est implemente

1. Entite User:
   - @Column(columnDefinition = "TEXT") sur avatarUrl
2. Migrateur au demarrage:
   - verifie information_schema.columns sur users.avatarurl
   - si type != text: ALTER TABLE users ALTER COLUMN avatarurl TYPE TEXT
   - log info en cas de migration, warn en cas d'impossibilite

### Impact fonctionnel

- Compatibilite ascendante pour bases existantes.
- Stabilite du stockage avatar meme sur payload long.

---

## 6) Ajustements config runtime user-service

### Fichier

- backend/user-service/src/main/resources/application.properties

### Problemes traites

1. URL JDBC par defaut non alignee avec le contexte service interne.
2. Appels frontend locaux bloques sans CORS explicite.

### Pourquoi ce changement

Faciliter un lancement en environnement compose/service et autoriser les appels front dev sur port 5173.

### Comment c'est implemente

1. DB URL par defaut:
   - jdbc:postgresql://user-db:5432/users_db
2. CORS active et ciblee dev:
   - origins: http://localhost:5173, http://127.0.0.1:5173
   - methods: GET,PUT,POST,DELETE,OPTIONS
   - headers: Authorization,Content-Type,Accept

### Impact fonctionnel

- Reduction des erreurs de connexion DB par defaut en environnement conteneurise.
- Reduction des blocages navigateur sur preflight/options en dev frontend.

---

## 7) Verification technique effectuee

Commande de validation executee:

- ./mvnw -pl user-service -DskipTests compile

Resultat:

- BUILD SUCCESS

Ce build confirme que les changements Java compilaient correctement dans le module user-service apres integration.

---

## 8) Risques residuels et recommandations

### Risques residuels

- Les avatars base64 restent lourds en transport HTTP meme avec serialisation defensive.
- Le backfill association est reactif (a la lecture/ecriture) et non une migration globale offline.

### Recommandations

1. Ajouter compression/redimensionnement image cote frontend avant envoi.
2. Basculer a terme vers stockage objet (URL externe) au lieu de data URL inline.
3. Prevoir une migration SQL dediee pour completer tous les organizers legacy en batch.
4. Ajouter tests d'integration pour:
   - organizer legacy sans ligne association
   - claims JWT partielles
   - avatar data URL depassant le seuil

---

## 9) Resume executif

Les changements backend ont principalement adresse 4 classes de defauts:

- incoherence role/subtype organizer (404 association-profile)
- fragilite JIT provisioning (claims manquantes + contraintes student)
- instabilite avatar en persistence/serialisation (taille et URI)
- absence d'endpoint d'identite courante (hydration frontend)

Le resultat attendu est une edition de profil plus fiable, moins d'erreurs 404/500, et une meilleure robustesse entre login reel et profil local.
