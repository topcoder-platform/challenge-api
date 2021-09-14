# Postman PoC test
## Prerequisite
- start db and es:
  ```bash
  $ cd challenge-api/local
  $ docker-compose up
  ```
- create tables:
  ```bash
  $ cd challenge-api 

    # NOTE:
    # if tables and data already exist, please run first

    # $ npm run drop-tables

    # to drop data and tables

  $ npm run create-tables
  ```
- start app
  ```bash
  $ cd challenge-api 
  $ source env.sh            # set env variables (or set .env file)
  $ NODE_ENV=test npm start
  ```

## newman test
  ```bash
  $ npm run test:newman       # runs newman test and automatically deletes the test data at the end
  ```

  ```bash
  $ npm run test:newman:clear  # clear the newman test data
  ```

## Mock Api
  Current mock api inside docker compose mocks BUS_API, GROUPS_API, PROJECTS_API and TERMS_API
