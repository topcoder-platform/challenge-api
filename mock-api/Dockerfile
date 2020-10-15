FROM node:10.20-jessie

COPY . /challenge-api

RUN (cd /challenge-api && npm install)

WORKDIR /challenge-api/mock-api

RUN npm install

CMD npm start
