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
  $ source env.sh            # set env variables
  $ NODE_ENV=test npm start
  ```

## newman test
  ```bash
  $ npm run test:newman
  ```


## Postman mock server
E2E tests use nock to mock `BUSAPI_URL`, where postman mock server could be used to replace nock.
Please refer to: https://drive.google.com/file/d/1GXMzyqpzwix-LDBwieiRFfpJlJxrTIgI/view?usp=sharing
