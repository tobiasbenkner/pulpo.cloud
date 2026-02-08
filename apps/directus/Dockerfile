FROM directus/directus:11.15.1

# Install community extensions
COPY package.json /directus/extensions/package.json
RUN cd /directus/extensions && pnpm install --prod

# Copy custom extension (pre-built)
COPY extensions/image-compression/dist/ /directus/extensions/image-compression/dist/
COPY extensions/image-compression/package.json /directus/extensions/image-compression/package.json

# Copy migrations
COPY migrations/ /directus/extensions/migrations/

# Copy snapshot (if available)
COPY snapshot/ /directus/snapshot/

# Copy entrypoint wrapper
COPY entrypoint.sh /directus/entrypoint.sh

USER root
RUN chmod +x /directus/entrypoint.sh
USER node

ENTRYPOINT ["/directus/entrypoint.sh"]
