FROM node:20-alpine as builder

WORKDIR /build
COPY ./extensions/invoice-processor ./extensions/invoice-processor

WORKDIR /build/extensions/invoice-processor
RUN npm ci
RUN npm run build

FROM directus/directus:11.15.1

COPY --from=builder /build/extensions/invoice-processor/dist /directus/extensions/invoice-processor/dist
COPY --from=builder /build/extensions/invoice-processor/package.json /directus/extensions/invoice-processor/package.json

WORKDIR /directus
RUN pnpm install @timio23/directus-group-tabs@3.0.0 @directus-labs/seo-plugin@1.1.1

COPY ./snapshot.yaml /directus/snapshot.yaml
COPY ./migrations /directus/migrations

COPY ./start.sh /directus/
USER root
RUN chmod +x /directus/start.sh
USER node

ENTRYPOINT []
CMD ["/directus/start.sh"]