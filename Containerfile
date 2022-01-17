FROM node:stretch-slim AS builder
USER node

WORKDIR /home/node

COPY --chown=node:node . .

RUN npm install
RUN npm run build

FROM node:stretch-slim

RUN useradd -ms /bin/bash appuser
USER appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /home/node/node_modules node_modules
COPY --from=builder --chown=appuser:appuser /home/node/package.json .
COPY --from=builder --chown=appuser:appuser /home/node/packages packages
COPY --from=builder --chown=appuser:appuser /home/node/data/flows.json /root/.node-red/flows.json


EXPOSE 1880

CMD [ "npm", "start" ]
