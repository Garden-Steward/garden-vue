FROM node:16.17.0

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./


RUN npm install

RUN mkdir dist && chmod -R 777 dist
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

COPY --chown=node:node . .

USER node

EXPOSE 5050
RUN echo "Node: " && node -v
RUN echo "NPM: " && npm -v
RUN npm run build

ENTRYPOINT ["/usr/local/bin/npm", "run preview"]

