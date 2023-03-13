FROM node:10.20-jessie

COPY . /challenge-api

RUN (cd /challenge-api && yarn install)

WORKDIR /challenge-api/mock-api

RUN yarn install

CMD yarn start
