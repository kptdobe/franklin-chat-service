FROM docker-asr-release.dr.corp.adobe.com/asr/nodejs_v14:2.0-alpine

COPY --chown=asruser node_modules node_modules
COPY --chown=asruser dist dist

WORKDIR ./dist

CMD [ "node", "-r", "dotenv/config", "app.js" ]
