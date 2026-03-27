FROM node:20-bullseye

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 1880

CMD ["npm", "start", "--", "--settings", "packages/node_modules/node-red/settings.js"]