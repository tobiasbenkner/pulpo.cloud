Das ist eine hervorragende Wahl. **Grafana Loki** ist für deinen Anwendungsfall (ein Server, begrenzte Ressourcen, "nur" 20 Container) meistens die wesentlich bessere Lösung als der ELK-Stack.

Hier ist alles, was du wissen musst – einfach erklärt.

### Was macht Loki anders als ELK?

Der entscheidende Unterschied liegt in der **Indexierung**:

*   **ELK (Elasticsearch):** Indexiert *jedes einzelne Wort* in deinen Logs. Das macht die Suche extrem schnell, verbraucht aber **gigantisch viel RAM** und Speicherplatz.
*   **Loki:** Indexiert **nur die Metadaten (Labels)** (z.B. `container_name`, `image_name`, `host`). Den eigentlichen Log-Text speichert es einfach komprimiert ab.

**Der Vorteil:**
Wenn du in Loki nach dem Wort "Error" suchst, ist es wie ein extrem schnelles `grep` auf der Kommandozeile. Da Loki so wenig indexiert, braucht es nur einen **Bruchteil des Arbeitsspeichers** (oft reichen 100-200 MB für Loki selbst, im Gegensatz zu 2-4 GB für Elasticsearch).

---

### Die Architektur: Der PLG-Stack

Statt ELK nennst du das hier **PLG**:

1.  **P**romtail (Der Sammler):
    *   Das ist ein winziger Agent.
    *   Er läuft als Docker-Container.
    *   Er liest automatisch die Docker-Logs (`/var/lib/docker/containers/...`) von deinen 20 Containern.
    *   Er klebt Labels dran (z.B. `container_name=mein-webserver`) und schickt sie an Loki.
2.  **L**oki (Der Speicher):
    *   Nimmt die Logs entgegen, sortiert sie und speichert sie effizient ab.
3.  **G**rafana (Das Gesicht):
    *   Hier visualisierst du die Logs.
    *   Hier stellst du das **Alerting** ein.

---

### Wie funktioniert das Alerting?

Das Alerting passiert direkt in Grafana. Du schreibst eine Query in der Sprache **LogQL** (ähnlich wie SQL oder PromQL).

**Beispiel für einen Alert:**
Du möchtest benachrichtigt werden, wenn in deinem Container `backend-api` das Wort `Exception` häufiger als 2 Mal pro Minute auftaucht.

Die LogQL Query sieht so aus:
```LogQL
count_over_time({container_name="backend-api"} |= "Exception" [1m])
```
In Grafana sagst du dann einfach: *Wenn Wert > 2, dann schick Nachricht an Slack/E-Mail/Telegram.*

---

### Setup-Anleitung (Copy & Paste)

Du brauchst zwei Dateien in einem Ordner: `docker-compose.yml` und `promtail-config.yaml`.

#### 1. Die Konfiguration (`promtail-config.yaml`)
Diese Datei sagt Promtail: "Hol dir die Logs von Docker".

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
    - targets:
        - localhost
      labels:
        job: varlogs
        __path__: /var/log/*log

  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
```

#### 2. Der Server-Stack (`docker-compose.yml`)

```yaml
version: "3"

networks:
  loki:

services:
  loki:
    image: grafana/loki:3.0.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - loki

  promtail:
    image: grafana/promtail:3.0.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro # Zugriff auf Host Logs
      - /var/run/docker.sock:/var/run/docker.sock # Um Container-Namen zu lesen
      - ./promtail-config.yaml:/etc/promtail/config.yml # Unsere Config von oben
    command: -config.file=/etc/promtail/config.yml
    networks:
      - loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin # Bitte ändern!
    networks:
      - loki
```

### Starten und Benutzen

1.  Starte den Stack: `docker-compose up -d`
2.  Öffne Grafana im Browser: `http://dein-server-ip:3000` (User: `admin`, PW: `admin`).
3.  Gehe zu **Connections** -> **Data Sources** -> **Add data source**.
4.  Wähle **Loki**.
5.  URL: `http://loki:3100` eingeben, "Save & Test" klicken.
6.  Gehe zu **Explore**. Wähle oben "Loki" aus.
7.  Klicke auf "Label filters" und wähle z.B. `container` -> `dein-container-name`.
8.  Klick auf "Run query".

### Fazit

Für dein Szenario (20 Container auf einem Server) ist Loki der **Goldstandard**.

*   Es frisst kaum Ressourcen (RAM/CPU).
*   Du hast die Logs deiner 20 Container automatisch drin (dank Promtail & Docker Socket).
*   Du kannst Alerts einrichten, wenn Logs Fehler werfen.
*   Es lässt noch genug Leistung für deine eigentlichen Anwendungen übrig.