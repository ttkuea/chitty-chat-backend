FROM node:12.14-slim

WORKDIR /home/node/app
COPY package.json yarn.lock ./
RUN npm install

COPY . .

CMD npm run start