FROM directus/directus:11.14
USER root
RUN corepack enable
USER node

# RUN pnpm install @directus-labs/spreadsheet-layout
# RUN pnpm install @tabshift/directus-schema-sync

COPY ./migrations /directus/migrations
COPY ./schema /directus/schema
