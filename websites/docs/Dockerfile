# Nginx stage - serve static files only
FROM nginx:alpine
ARG WEBSITE
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
