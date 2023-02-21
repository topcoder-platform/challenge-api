#!/bin/bash
set -eo pipefail
APP_NAME=$1
UPDATE_CACHE=""
docker-compose -f docker/docker-compose.yml build $APP_NAME
docker create --name app $APP_NAME:latest

if [ -d node_modules ]
then
  mv yarn.lock old-yarn.lock
  docker cp app:/$APP_NAME/yarn.lock yarn.lock
  set +eo pipefail
  UPDATE_CACHE=$(cmp yarn.lock old-yarn.lock)
  set -eo pipefail
else
  UPDATE_CACHE=1
fi

if [ "$UPDATE_CACHE" == 1 ]
then
  docker cp app:/$APP_NAME/node_modules .
fi