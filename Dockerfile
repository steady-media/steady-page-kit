# steady-page-kit — portabler Node-Pfad als Container.
# Läuft auf jedem Docker-Host (Render, Railway, Fly, Coolify, VPS …).
#
#   docker build -t steady-page-kit .
#   docker run -p 8788:8788 -v kit-data:/app/data --env-file .env steady-page-kit
#
# WICHTIG: /app/data braucht ein Volume/eine persistente Disk — dort liegen
# veröffentlichte Einstellungen, Logo und Claps (siehe docs/agent/deploy/).

FROM node:22-alpine

WORKDIR /app
COPY . .

# Keine Runtime-Dependencies — npm install ist nicht nötig.
ENV NODE_ENV=production
ENV KIT_DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 8788
VOLUME /app/data

CMD ["node", "server/node.js"]
