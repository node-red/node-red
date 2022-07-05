FROM node:18

WORKDIR /app

COPY . .

RUN npm install

ENV NODE_ENV=production

RUN npm run build

CMD [ "npm", "start", "--", "data/flows.json" ]