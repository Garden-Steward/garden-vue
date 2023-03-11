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

RUN npm run build

CMD ["npm", "run preview"]

