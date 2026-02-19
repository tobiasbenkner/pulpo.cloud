FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate

WORKDIR /build

# Workspace-Config + Packages kopieren
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/invoice/ packages/invoice/
COPY packages/directus-extension/ packages/directus-extension/

# Dependencies installieren (pnpm löst workspace:* auf)
RUN pnpm install --frozen-lockfile --filter pulpo-extension...

# Extension bauen
WORKDIR /build/packages/directus-extension
RUN pnpm run build

# --- Production Stage ---
FROM directus/directus:11.15.4

COPY --from=builder /build/packages/directus-extension/dist /directus/extensions/directus-extension/dist
COPY --from=builder /build/packages/directus-extension/package.json /directus/extensions/directus-extension/package.json

WORKDIR /directus
RUN pnpm install @timio23/directus-group-tabs@3.0.0 @directus-labs/seo-plugin@1.1.1

# COPY apps/directus/snapshot.yaml /directus/snapshot.yaml
# COPY apps/directus/migrations /directus/migrations

COPY apps/directus/start.sh /directus/
USER root
RUN chmod +x /directus/start.sh
USER node

ENTRYPOINT []
CMD ["/directus/start.sh"]
