# Search Service — Investigation complète des problèmes

> **Destinataire :** Développeur backend  
> **Date :** 2026-05-30  
> **Périmètre :** `search-service` (Quarkus + PostgreSQL + Kafka)  
> **Statut global :** La fonctionnalité de recherche est **non fonctionnelle** en dev et en prod.

---

## TL;DR

La page de recherche ne retourne aucun résultat pour les raisons suivantes, par ordre de priorité :

1. La table `search_events` est **toujours vide** (Kafka mal câblé — aucun événement indexé).
2. Même si la table contenait des données, la requête SQL **ne filtre rien** (`buildQuery` = `"1=1"`).
3. Le contrôleur **jette la moitié des paramètres** avant d'appeler le service.
4. Le mapping de réponse **ne remplit pas** les champs affichés dans les cartes.
5. Les facettes de la sidebar sont **hardcodées** en dur.
6. La **route Kong exige un JWT**, alors que le spec dit que la recherche est publique.
7. Le frontend appelle un **mauvais endpoint** pour les suggestions d'autocomplétion.
8. Le modèle `SearchEvent` n'a **pas de champ `status`**, ce qui cause un échec de compilation sur build propre.

---

## Bug #1 (BLOQUANT PROD) — Index Kafka jamais alimenté

### Fichier

`src/main/resources/application.properties`

### Description

Les deux consumers Kafka déclarent des canaux (`@Incoming("events")`, `@Incoming("organizers")`)
qui n'ont **aucune configuration** dans `application.properties`.
Sans entrée `mp.messaging.incoming.*`, SmallRye Reactive Messaging cherche un topic Kafka nommé
exactement `"events"` — ce topic n'existe pas.

Les topics réels publiés par l'event-service sont :

| Topic Kafka       | Déclencheur                |
| ----------------- | -------------------------- |
| `event.created`   | Création d'un événement    |
| `event.updated`   | Mise à jour d'un événement |
| `event.cancelled` | Annulation / suppression   |

La configuration actuellement présente pour `event-cancelled` correspond au `registration-service`
(groupe `registration-service`) et non au search-service.

De plus, `kafka.bootstrap.servers` n'est défini que pour le profil `%prod`.
En mode `%dev` (démarrage local / docker-compose), le search-service ne sait pas où se connecter à Kafka,
donc aucun message n'est jamais reçu dans aucun environnement.

### Correction

```properties
# --- Dans application.properties ---

# Remplacer
%prod.kafka.bootstrap.servers=kafka:9092

# Par (fonctionne en dev, docker-compose et prod)
kafka.bootstrap.servers=${KAFKA_BOOTSTRAP_SERVERS:kafka:9092}

# Ajouter le canal "events" → topics event.created + event.updated
mp.messaging.incoming.events.connector=smallrye-kafka
mp.messaging.incoming.events.topics=event.created,event.updated
mp.messaging.incoming.events.value.deserializer=org.apache.kafka.common.serialization.StringDeserializer
mp.messaging.incoming.events.group.id=search-service

# Corriger le canal event-cancelled (actuellement configuré avec le group.id du registration-service)
mp.messaging.incoming.event-cancelled.connector=smallrye-kafka
mp.messaging.incoming.event-cancelled.topic=event.cancelled
mp.messaging.incoming.event-cancelled.value.deserializer=org.apache.kafka.common.serialization.StringDeserializer
mp.messaging.incoming.event-cancelled.group.id=search-service   # ← était "registration-service"

# SUPPRIMER les 3 blocs outgoing.registration-* (copier-coller du registration-service,
# ils n'ont rien à faire ici et peuvent provoquer des erreurs de wiring au démarrage)
# mp.messaging.outgoing.registration-confirmed.*
# mp.messaging.outgoing.registration-waitlisted.*
# mp.messaging.outgoing.registration-cancelled.*
```

---

## Bug #2 (CRITIQUE) — `buildQuery()` ne filtre rien

### Fichier

`src/main/java/ch/unige/pinfo/search/service/EventSearchService.java`

### Description

```java
private QueryWrapper buildQuery(String q, String cat, String fac) {
    // Logique de construction dynamique de chaîne HQL
    return new QueryWrapper("1=1", Map.of()); // ← q, cat, fac complètement ignorés
}
```

Toute recherche retourne l'intégralité de la table `search_events` sans aucun filtrage.

### Correction attendue

Construire dynamiquement la clause HQL selon les paramètres non-nuls :

```java
private QueryWrapper buildQuery(String q, String cat, String fac, LocalDate dateFrom,
                                LocalDate dateTo, String place, Boolean hasAvailableSlots,
                                String sort) {
    var conditions = new ArrayList<String>();
    var params = new HashMap<String, Object>();

    // Filtre statut : toujours PUBLISHED
    conditions.add("status = 'PUBLISHED'");

    if (q != null && !q.isBlank()) {
        // pg_trgm : utiliser LIKE ou une requête native avec similarity()
        conditions.add("(lower(title) like :q or lower(description) like :q)");
        params.put("q", "%" + q.toLowerCase() + "%");
    }
    if (cat != null && !cat.isBlank()) {
        conditions.add("category = :cat");
        params.put("cat", cat);
    }
    if (fac != null && !fac.isBlank()) {
        conditions.add("(:fac member of eligibleFaculties or eligibleFaculties is empty)");
        params.put("fac", fac);
    }
    if (dateFrom != null) {
        conditions.add("cast(time as date) >= :dateFrom");
        params.put("dateFrom", dateFrom);
    }
    if (dateTo != null) {
        conditions.add("cast(time as date) <= :dateTo");
        params.put("dateTo", dateTo);
    }
    if (place != null && !place.isBlank()) {
        conditions.add("lower(place) like :place");
        params.put("place", "%" + place.toLowerCase() + "%");
    }
    if (Boolean.TRUE.equals(hasAvailableSlots)) {
        conditions.add("(capacity is null or registeredCount < capacity)");
    }

    String hql = String.join(" and ", conditions);
    // Tri
    String orderBy = switch (sort == null ? "date_asc" : sort) {
        case "date_desc" -> " order by time desc";
        default -> " order by time asc";
    };
    return new QueryWrapper(hql + orderBy, params);
}
```

> **Note sur `pg_trgm` :** L'OpenAPI spec promet un fuzzy matching via `pg_trgm`.
> Pour cela, il faut soit une requête native SQL (`similarity(title, :q) > 0.3`),
> soit un index `CREATE INDEX ON search_events USING gin(title gin_trgm_ops)` et l'extension activée
> (`CREATE EXTENSION IF NOT EXISTS pg_trgm;` dans le script d'init de la DB).
> Aucun des deux n'est actuellement présent.

---

## Bug #3 (CRITIQUE) — Le contrôleur jette la moitié des paramètres

### Fichier

`src/main/java/ch/unige/pinfo/search/resource/EventSearchResource.java`

### Description

```java
// Le contrôleur reçoit : q, category, dateFrom, dateTo, place,
//                        organizerId, faculty, degreeLevel,
//                        hasAvailableSlots, sort, page, size
return searchService.search(q, category, faculty, page, size);
//                          ↑ dateFrom, dateTo, place, organizerId,
//                            degreeLevel, hasAvailableSlots, sort → perdus
```

Les filtres suivants sont silencieusement ignorés :

- Plage de dates (`dateFrom`, `dateTo`)
- Lieu (`place`)
- ID organisateur (`organizerId`)
- Niveau d'études (`degreeLevel`)
- Toggle "Places disponibles" (`hasAvailableSlots`)
- Tri (`sort`)

### Correction

Mettre à jour la signature de `EventSearchService.search()` pour accepter tous les paramètres,
et les passer depuis le contrôleur :

```java
return searchService.search(q, category, faculty, dateFrom, dateTo, place,
                            organizerId, degreeLevel, hasAvailableSlots, sort,
                            page != null ? page : 0,
                            size != null ? size : 20);
```

---

## Bug #4 (IMPORTANT) — `mapToHit()` ne remplit pas les champs affichés dans les cartes

### Fichier

`src/main/java/ch/unige/pinfo/search/service/EventSearchService.java`

### Description

La méthode de mapping ne copie que 5 champs sur une vingtaine disponibles :

```java
private EventSearchHit mapToHit(SearchEvent entity) {
    EventSearchHit hit = new EventSearchHit();
    hit.setEventId(entity.eventId);
    hit.setTitle(entity.title);
    hit.setCategory(entity.category);
    hit.setRegisteredCount(entity.registeredCount);
    hit.setIsFull(...);
    return hit;
    // ↑ time, endTime, place, organizerName, tags, capacity → NON MAPPÉS
}
```

### Champs manquants et impact UI

| Champ manquant   | Élément UI concerné                   |
| ---------------- | ------------------------------------- |
| `time`           | Bloc date (jour / mois) + heure       |
| `endTime`        | Heure de fin                          |
| `place`          | Icône lieu                            |
| `organizerName`  | Nom de l'organisateur                 |
| `tags`           | Badges `#tag`                         |
| `capacity`       | Total de places                       |
| `availableSlots` | Compteur `X / Y places`               |
| `restrictedTo`   | Règles d'éligibilité (faculté/niveau) |

### Correction

```java
private EventSearchHit mapToHit(SearchEvent entity) {
    EventSearchHit hit = new EventSearchHit();
    hit.setEventId(entity.eventId);
    hit.setTitle(entity.title);
    hit.setCategory(entity.category);
    hit.setPlace(entity.place);
    hit.setTime(entity.time);
    hit.setEndTime(entity.endTime);
    hit.setOrganizerName(entity.organizerName);
    hit.setTags(entity.tags);
    hit.setCapacity(entity.capacity);
    hit.setRegisteredCount(entity.registeredCount);
    hit.setIsFull(entity.capacity != null && entity.registeredCount != null
                  && entity.registeredCount >= entity.capacity);
    if (entity.capacity != null && entity.registeredCount != null) {
        hit.setAvailableSlots(Math.max(0, entity.capacity - entity.registeredCount));
    }
    return hit;
}
```

> **Note :** Vérifier que les setters correspondants existent dans `EventSearchHit`
> (la classe est générée depuis `search-service.yaml` via openapi-generator).
> Si certains champs ne sont pas dans le schéma YAML (`EventSearchHit`), il faut d'abord les ajouter.

---

## Bug #5 (IMPORTANT) — Facettes hardcodées

### Fichier

`src/main/java/ch/unige/pinfo/search/service/EventSearchService.java`

### Description

```java
private Facets generateFacets() {
    Facets f = new Facets();
    f.setCategories(List.of(new FacetBucket().value("Conference").count(10)));
    return f;
    // ↑ une seule catégorie fictive — jamais mise à jour
}
```

Le panneau de filtres affiche toujours "Conference (10)" quelle que soit la base de données.

### Correction

Remplacer par des requêtes `GROUP BY` natives :

```java
private Facets generateFacets(/* passer les mêmes filtres actifs */) {
    // Catégories
    List<Object[]> cats = em.createNativeQuery(
        "SELECT category, COUNT(*) FROM search_events WHERE status = 'PUBLISHED' " +
        "GROUP BY category ORDER BY COUNT(*) DESC LIMIT 20"
    ).getResultList();
    List<FacetBucket> catBuckets = cats.stream()
        .map(r -> new FacetBucket().value((String)r[0]).count(((Number)r[1]).intValue()))
        .toList();

    // Niveaux d'études
    List<Object[]> levels = em.createNativeQuery(
        "SELECT degree_level, COUNT(DISTINCT event_id) " +
        "FROM event_eligible_degree_levels GROUP BY degree_level"
    ).getResultList();
    // ... idem pour les lieux (place)

    Facets f = new Facets();
    f.setCategories(catBuckets);
    return f;
}
```

---

## Bug #6 (BLOQUANT) — Champ `status` absent du modèle `SearchEvent`

### Fichiers

- `src/main/java/ch/unige/pinfo/search/model/SearchEvent.java`
- `src/main/java/ch/unige/pinfo/search/messaging/EventIndexingConsumer.java`
- `src/test/java/ch/unige/pinfo/search/resource/EventSearchResourceTest.java` (ligne 42)

### Description

Le test `EventSearchResourceTest` assigne `event.status = "PUBLISHED"` (ligne 42),
mais la classe `SearchEvent` **n'a pas de champ `status`**.

Sur un build propre (`mvn clean test`), cela provoque une **erreur de compilation**.
Le rapport de test actuel provient de classes compilées antérieurement (build incrémental).

De plus, `EventIndexingConsumer.mapDtoToEntity()` ne mappe pas `dto.getStatus()` vers l'entité,
donc même si le champ était ajouté, son statut serait toujours `null`.

### Impact

- Build propre impossible.
- La requête de recherche ne peut pas filtrer sur `status = 'PUBLISHED'` (cf. Bug #2).

### Correction

**1. Ajouter le champ dans `SearchEvent.java` :**

```java
@Column(nullable = false)
public String status = "PUBLISHED"; // valeur par défaut de sécurité
```

**2. Mapper le champ dans `EventIndexingConsumer.mapDtoToEntity()` :**

```java
entity.status = dto.getStatus() != null ? dto.getStatus() : "PUBLISHED";
```

---

## Bug #7 (BLOQUANT DEV/PROD) — Kong exige un JWT pour la recherche publique

### Fichier

`backend/kong/kong.yml`

### Description

La route `/api/search` est déclarée avec le plugin `jwt` :

```yaml
- name: search-service
  url: http://search-service:8085
  routes:
    - name: search-route
      paths:
        - /api/search
      strip_path: false
  plugins:
    - name: jwt # ← bloque toute requête sans token
```

Or la spec OpenAPI du search-service précise explicitement :

> _"All endpoints are read-only and publicly accessible."_

Un utilisateur non connecté (page de recherche avant login) obtient un **401 Unauthorized**
sur chaque appel à `/api/search/events` et `/api/search/events/suggestions`.

### Correction

Supprimer le plugin `jwt` de la route `search-service` dans `kong.yml` :

```yaml
- name: search-service
  url: http://search-service:8085
  routes:
    - name: search-route
      paths:
        - /api/search
      strip_path: false
  # Pas de plugin jwt — recherche publique
```

---

## Bug #8 (IMPORTANT) — Mauvais endpoint pour les suggestions (frontend)

### Fichier

`frontend/src/lib/apiServices.js` (ligne 212)

### Description

Le frontend appelle `/api/search/suggestions`, mais l'endpoint réel est
`/api/search/events/suggestions` :

```js
// Code actuel (FAUX)
const response = await apiClient.get('/api/search/suggestions', { params: { q, limit } })

// Endpoint déclaré dans EventSearchResource.java
@Path("/api/search/events")
// → GET /api/search/events/suggestions
```

Résultat : toutes les requêtes de suggestions d'autocomplétion reçoivent un **404**,
la liste de suggestions reste vide, et une exception non gérée est loguée en console.

### Correction (frontend)

```js
// frontend/src/lib/apiServices.js
const response = await apiClient.get("/api/search/events/suggestions", {
  params: { q, limit },
});
```

---

## Bug #9 (MINEUR) — Mauvaise audience JWT

### Fichier

`src/main/resources/application.properties`

### Description

```properties
mp.jwt.verify.audiences=https://user-service.unigevents.com
```

Tous les autres services utilisent `https://api.unigevents.ch` comme audience.
Si le search-service venait à être sécurisé avec JWT (ex: endpoints admin),
tous les tokens seraient rejetés avec une erreur `invalid audience`.

### Correction

```properties
mp.jwt.verify.audiences=https://api.unigevents.ch
```

---

## Bug #10 (MINEUR) — `registeredCount` peut être `null` (NPE potentiel)

### Fichier

`src/main/java/ch/unige/pinfo/search/service/EventSearchService.java`

### Description

```java
hit.setIsFull(entity.capacity != null && entity.registeredCount >= entity.capacity);
//                                        ↑ peut lever NullPointerException si registeredCount est null
```

Si `registeredCount` n'est pas renseigné dans l'index (événement créé avant l'indexation
complète), le déréférencement auto-unboxing de `Integer` → `int` lève une `NullPointerException`.

### Correction

```java
hit.setIsFull(entity.capacity != null
              && entity.registeredCount != null
              && entity.registeredCount >= entity.capacity);
```

---

## Récapitulatif

| #   | Sévérité  | Fichier principal                            | Symptôme                                                        |
| --- | --------- | -------------------------------------------- | --------------------------------------------------------------- |
| 1   | BLOQUANT  | `application.properties`                     | Index vide — aucun événement reçu par Kafka en dev ou prod      |
| 2   | CRITIQUE  | `EventSearchService.buildQuery()`            | Recherche textuelle et tous les filtres sans effet              |
| 3   | CRITIQUE  | `EventSearchResource.apiSearchEventsGet()`   | Dates, lieu, niveau, disponibilité, tri silencieusement ignorés |
| 4   | IMPORTANT | `EventSearchService.mapToHit()`              | Cartes sans date, lieu, organisateur, tags ni capacité          |
| 5   | IMPORTANT | `EventSearchService.generateFacets()`        | Sidebar avec une seule catégorie fictive                        |
| 6   | BLOQUANT  | `SearchEvent.java` + `EventIndexingConsumer` | Champ `status` absent — échec de compilation sur build propre   |
| 7   | BLOQUANT  | `kong/kong.yml`                              | 401 sur toutes les requêtes de recherche sans token             |
| 8   | IMPORTANT | `frontend/src/lib/apiServices.js`            | Suggestions d'autocomplétion → 404 (mauvais chemin URL)         |
| 9   | MINEUR    | `application.properties`                     | Mauvaise audience JWT si la recherche est un jour sécurisée     |
| 10  | MINEUR    | `EventSearchService.mapToHit()`              | NPE potentiel si `registeredCount` est null                     |

### Ordre de résolution recommandé

```
Bug #6 → build propre fonctionnel
Bug #7 → recherche accessible sans login
Bug #1 → index alimenté (données présentes)
Bug #2 + #3 → filtres opérationnels
Bug #8 → suggestions fonctionnelles (frontend)
Bug #4 → cartes complètes
Bug #5 → sidebar dynamique
Bug #10 → robustesse
Bug #9 → cohérence JWT
```

### Test de validation (après correction)

1. Créer un événement via l'event-service.
2. Vérifier dans `search_events` que l'événement apparaît (Kafka → consumer → DB).
3. Appeler `GET /api/search/events?q=<mot-clé>` sans token → réponse 200 avec résultats filtrés.
4. Appeler `GET /api/search/events/suggestions?q=<partiel>` → liste de suggestions.
5. Vérifier que les cartes affichent date, lieu, organisateur et tags.
6. Vérifier que les facettes de la sidebar reflètent les catégories réelles.
