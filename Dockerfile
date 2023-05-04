FROM --platform=linux/amd64 node:18.4.0-alpine

COPY --chown=node:node package.json package.json
COPY --chown=node:node node_modules node_modules
COPY --chown=node:node dist dist

CMD [ "node", "-r", "dotenv/config", "dist/app.js" ]
