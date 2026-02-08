# 🚀 Directus Deployment Workflow: Dev → Prod

## 1️⃣ Voraussetzungen

* **Docker Compose** für Dev & Prod
* **Directus CLI** installiert (`npx directus`)
* **Git** zur Versionierung von Schema, Extensions & Migrationen
* **Datenbankzugang** (Postgres oder MySQL)
* **Uploads** & **Extensions** versioniert oder synchronisierbar

---

## 2️⃣ Lokale Entwicklung (Dev)

1. **Schema ändern**

   * Neue Collection / Field / Relation → direkt in Dev-UI oder CLI
   * Danach CLI Export:

```bash
npx directus schema export --file ./migrations/schema.json
```

2. **Policies / Rollen / Flows**

   * Rollen exportieren:

```bash
npx directus roles export --file ./migrations/roles.json
```

* Permissions exportieren:

```bash
npx directus permissions export --file ./migrations/permissions.json
```

* Flows exportieren:

```bash
npx directus flows export --file ./migrations/flows.json
```

3. **Extensions & Uploads**

   * Hooks / Endpoints / Interfaces unter `./extensions/` speichern
   * Optional Uploads lokal in `./uploads` (nur wenn nötig für Prod-Test)

4. **Datenbankänderungen (SQL)**

   * Für Indizes, Constraints oder spezielle SQL-Migrationen
   * Beispiel:

```sql
CREATE INDEX idx_reservations_tenant_date ON reservations(tenant_id, reservation_at);
```

* Speichern in `./migrations/sql/001_add_indexes.sql`

---

## 3️⃣ Staging-Test (optional, empfohlen)

* Auf Staging-Server die Änderungen anwenden:

```bash
docker compose pull
docker compose up -d
npx directus schema apply --file ./migrations/schema.json
npx directus roles import --file ./migrations/roles.json
npx directus permissions import --file ./migrations/permissions.json
npx directus flows import --file ./migrations/flows.json
```

* SQL-Migrationen ausführen:

```bash
psql -U user -d db -f ./migrations/sql/001_add_indexes.sql
```

* Uploads / Extensions synchronisieren:

```bash
rsync -av ./uploads user@staging:/directus/uploads
rsync -av ./extensions user@staging:/directus/extensions
```

✅ Staging testen → UI + Queries + Indexnutzung prüfen

---

## 4️⃣ Produktion

1. **Backup**

   * DB:

```bash
pg_dump -U user dbname > backup_$(date +%F).sql
```

* Uploads / Extensions:

```bash
rsync -av /directus/uploads ./backups/uploads
rsync -av /directus/extensions ./backups/extensions
```

2. **Deploy Änderungen**

```bash
git pull
docker compose pull
docker compose up -d
```

3. **Schema / Policies / Flows**

```bash
npx directus schema apply --file ./migrations/schema.json
npx directus roles import --file ./migrations/roles.json
npx directus permissions import --file ./migrations/permissions.json
npx directus flows import --file ./migrations/flows.json
```

4. **SQL-Migrationen**

```bash
psql -U user -d db -f ./migrations/sql/001_add_indexes.sql
```

5. **Uploads / Extensions**

```bash
rsync -av ./uploads user@prod:/directus/uploads
rsync -av ./extensions user@prod:/directus/extensions
```

---

## 5️⃣ Datenmigrationen

Wenn du Daten von Dev → Prod übertragen musst (z. B. Lookup Tables oder Seeds):

* Kleinere Tabellen: CSV Export → Import via CLI oder API
* Größere Tabellen: SQL INSERT / COPY oder Migration Scripts
* **Nie komplette Prod DB überschreiben**, sonst Datenverlust

---

## 6️⃣ CI/CD (optional, Profi-Level)

* GitHub Actions / GitLab CI:

  1. Pull Changes → Build Docker
  2. Test Schema apply auf Staging DB
  3. Deploy to Prod → Docker Up + CLI Imports + SQL Migrations
  4. Slack / Teams Notification

✅ Vorteil: reproduzierbar, automatisiert, kein händisches Kopieren

---

## 7️⃣ Best Practices

1. **Alles versionieren**: Schema, Policies, Flows, SQL, Extensions
2. **Backups**: Immer DB + Uploads vor Prod Deployment
3. **Staging zuerst** testen
4. **Index & Query prüfen** → EXPLAIN ANALYZE
5. **Keine manuellen UI-Änderungen in Prod**, sonst drift

