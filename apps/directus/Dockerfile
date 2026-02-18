FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /build

# Workspace-Config + Shared Package + Extension kopieren
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/invoice/ packages/invoice/
COPY apps/directus/extensions/invoice-processor/ apps/directus/extensions/invoice-processor/

# Dependencies installieren (pnpm löst workspace:* auf)
RUN pnpm install --frozen-lockfile --filter invoice-processor...

# Extension bauen
WORKDIR /build/apps/directus/extensions/invoice-processor
RUN pnpm run build

# --- Production Stage ---
FROM directus/directus:11.15.3

COPY --from=builder /build/apps/directus/extensions/invoice-processor/dist /directus/extensions/invoice-processor/dist
COPY --from=builder /build/apps/directus/extensions/invoice-processor/package.json /directus/extensions/invoice-processor/package.json

WORKDIR /directus
RUN pnpm install @timio23/directus-group-tabs@3.0.0 @directus-labs/seo-plugin@1.1.1

# COPY ./snapshot.yaml /directus/snapshot.yaml
# COPY ./migrations /directus/migrations

COPY apps/directus/start.sh /directus/
USER root
RUN chmod +x /directus/start.sh
USER node

ENTRYPOINT []
CMD ["/directus/start.sh"]
