# STAGE 1: Build der Extension
# Wir nutzen ein Node Image, um die Extension zu kompilieren (npm run build)
FROM node:20-alpine as builder

WORKDIR /build

# Wir kopieren den Extension-Ordner rein
COPY ./extensions/invoice-processor ./extensions/invoice-processor

# In den Ordner gehen, Abhängigkeiten installieren und bauen
WORKDIR /build/extensions/invoice-processor
RUN npm ci
RUN npm run build


# STAGE 2: Das eigentliche Directus Image
# Wir nehmen das offizielle Directus Image als Basis
FROM directus/directus:11.15.1

# Wir wechseln zum User root, um Schreibrechte für das Kopieren zu haben (falls nötig)
USER root

# Wir kopieren das "gebaute" Ergebnis aus Stage 1 in den Extensions-Ordner von Directus
# Directus erwartet Extensions unter /directus/extensions/<name>/
COPY --from=builder /build/extensions/invoice-processor/dist /directus/extensions/invoice-processor/dist
COPY --from=builder /build/extensions/invoice-processor/package.json /directus/extensions/invoice-processor/package.json

# Optional: Falls deine Extension Production-Dependencies hat, müsstest du hier noch npm install machen.
# Da wir meistens nur 'directus' als devDependency haben, reicht das Kopieren oft.
# Falls nötig:
# WORKDIR /directus/extensions/invoice-processor
# RUN npm install --production

# Zurück zum Directus Arbeitsverzeichnis
WORKDIR /directus
# RUN npm install @timio23/directus-group-tabs @directus-labs/seo-plugin

# Wieder auf den Standard-User node wechseln (Security Best Practice)
USER node