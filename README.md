# Topcoder Challenge API

This microservice provides access and interaction with all sorts of Challenge data.

## Devlopment status

[![Total alerts](https://img.shields.io/lgtm/alerts/g/topcoder-platform/challenge-api.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/topcoder-platform/challenge-api/alerts/)[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/topcoder-platform/challenge-api.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/topcoder-platform/challenge-api/context:javascript)

### Deployment status

Dev: [![CircleCI](https://circleci.com/gh/topcoder-platform/challenge-api/tree/develop.svg?style=svg)](https://circleci.com/gh/topcoder-platform/challenge-api/tree/develop) Prod: [![CircleCI](https://circleci.com/gh/topcoder-platform/challenge-api/tree/master.svg?style=svg)](https://circleci.com/gh/topcoder-platform/challenge-api/tree/master)

## Swagger definition

- [Swagger](https://api.topcoder.com/v5/challenges/docs/)

## Intended use

- Production API

## Related repos

- [Resources API](https://github.com/topcoder-platform/resources-api)

## Prerequisites

- [NodeJS](https://nodejs.org/en/) (v18+)
- [AWS S3](https://aws.amazon.com/s3/)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Configuration

Configuration for the application is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- READONLY: sets the API in read-only mode. POST/PUT/PATCH/DELETE operations will return 403 Forbidden
- LOG_LEVEL: the log level, default is 'debug'
- PORT: the server port, default is 3000
- AUTH_SECRET: The authorization secret used during token verification.
- VALID_ISSUERS: The valid issuer of tokens.
- AUTH0_URL: AUTH0 URL, used to get M2M token
- AUTH0_PROXY_SERVER_URL: AUTH0 proxy server URL, used to get M2M token
- AUTH0_AUDIENCE: AUTH0 audience, used to get M2M token
- TOKEN_CACHE_TIME: AUTH0 token cache time, used to get M2M token
- AUTH0_CLIENT_ID: AUTH0 client id, used to get M2M token
- AUTH0_CLIENT_SECRET: AUTH0 client secret, used to get M2M token
- BUSAPI_URL: Bus API URL
- KAFKA_ERROR_TOPIC: Kafka error topic used by bus API wrapper
- AMAZON.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting.
- AMAZON.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting.
- AMAZON.AWS_REGION: The Amazon certificate region to use when connecting.
- AMAZON.ATTACHMENT_S3_BUCKET: the AWS S3 bucket to store attachments
- FILE_UPLOAD_SIZE_LIMIT: the file upload size limit in bytes
- RESOURCES_API_URL: TC resources API base URL
- GROUPS_API_URL: TC groups API base URL
- PROJECTS_API_URL: TC projects API base URL
- CHALLENGE_MIGRATION_APP_URL: migration app URL
- TERMS_API_URL: TC Terms API Base URL
- COPILOT_RESOURCE_ROLE_IDS: copilot resource role ids allowed to upload attachment
- HEALTH_CHECK_TIMEOUT: health check timeout in milliseconds
- SCOPES: the configurable M2M token scopes, refer `config/default.js` for more details
- M2M_AUDIT_HANDLE: the audit name used when perform create/update operation using M2M token
- FORUM_TITLE_LENGTH_LIMIT: the forum title length limit

You can find sample `.env` files inside the `/docs` directory.

## Available commands

Make sure you have set environment variable `DATABASE_URL` before any database operations.

1. Creating tables: `npm run create-tables`
2. Seed/Insert data to tables: `npm run seed-tables`
3. Start all the depending services for local deployment: `npm run services:up`
4. Stop all the depending services for local deployment: `npm run services:down`
5. Check the logs of all the depending services for local deployment: `npm run services:logs`
6. Initialize the local environments: `npm run local:init`
7. Reset the local environments: `npm run local:reset`

### Notes

- The seed data are located in `src/scripts/seed`

## Local Deployment

0. Make sure to use Node v10+ by command `node -v`. We recommend using [NVM](https://github.com/nvm-sh/nvm) to quickly switch to the right version:

   ```bash
   nvm use
   ```

1. ⚙ Local config
   In the `challenge-api` root directory create `.env` file with the next environment variables. Values for **Auth0 config** should be shared with you on the forum.<br>

   ```bash
   # Auth0 config
   AUTH0_URL=
   AUTH0_PROXY_SERVER_URL=
   AUTH0_AUDIENCE=
   AUTH0_CLIENT_ID=
   AUTH0_CLIENT_SECRET=
   ```

   - Values from this file would be automatically used by many `npm` commands.
   - ⚠️ Never commit this file or its copy to the repository!

   Please make sure database url is configured before everything.
   ```bash
   DATABASE_URL=
   ```

   After that you can run `npm install` to install dependencies. And then prisma will setup clients automatically.

2. 🚢 Start docker-compose with services which are required to start Topcoder Challenges API locally

   ```bash
   npm run services:up
   ```
   This command will start postgres with docker-compose.

   If you are running services with docker, you can run:
   ```bash
   docker run -d --name challengedb -p 5432:5432 \
      -e POSTGRES_USER=johndoe -e POSTGRES_DB=challengedb \
      -e POSTGRES_PASSWORD=mypassword \
      postgres:16.8
   ```

   The command to set `DATABASE_URL` environment variable will be like
   ```bash
   export DATABASE_URL="postgresql://johndoe:mypassword@localhost:5432/challengedb?schema=public"
   ```
   Be sure to run it before running `npm install`


3. ♻ Running mock-api:

   TopCoder Challenge API calls many other APIs like Terms API, Groups API, Projects API, Resources API.

   Starting them all is a little complicated. Mock APIs are created in `mock-api`.

   You can run it with
   ```bash
   cd mock-api
   npm start
   ```
   It will start a mock service at port `4000` at default, and it works well with Challenge API.

   You might also need to update the API URLs in `config/default.js` Line 44~57 with environment variables. The commands are like:
   ```bash
   export RESOURCES_API_URL="http://localhost:4000/v5/resources"
   export PROJECTS_API_URL="http://localhost:4000/v5/projects"
   export TERMS_API_URL="http://localhost:4000/v5/terms"
   export RESOURCE_ROLES_API_URL="http://localhost:4000/v5/resource-roles"
   ```

4. ♻ Create tables and setup testdata

   To create database tables, you can run:
   ```bash
   npm run create-tables
   ```

   To create test data, you can run:
   ```bash
   npm run seed-tables
   ```

   To reset db structure and create testdata, you can run:
   ```bash
   npm run local:init
   ```

5. Comment Code for M2M Token and postBusEvent

   In local environment, you don't need to use M2M Token or bus API.

   You can just comment them to make it working.

   For M2M token, you need to comment `src/common/m2m-helper.js#L18`, just return an empty string.

   The content will be like:
   ```js
   getM2MToken() {
      // return M2MHelper.m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET);
      return '';
   }
   ```

   For postBusEvent, you need to comment codes in `src/common/helper.js#L684`. The content will be like:
   ```js
   async function postBusEvent(topic, payload, options = {}) {
      // const client = getBusApiClient();
      const message = {
         topic,
         originator: constants.EVENT_ORIGINATOR,
         timestamp: new Date().toISOString(),
         "mime-type": constants.EVENT_MIME_TYPE,
         payload,
      };
      if (options.key) {
         message.key = options.key;
      }
      // await client.postEvent(message);
   }
   ```

6. 🚀 Start Topcoder Challenge API

   ```bash
   npm start
   ```

   The Topcoder Challenge API will be served on `http://localhost:3000`

## Production deployment

- TBD

## Running tests

### Configuration

Test configuration is at `config/test.js`. You don't need to change them.
The following test parameters can be set in config file or in env variables:

- ADMIN_TOKEN: admin token
- COPILOT_TOKEN: copilot token
- USER_TOKEN: user token
- EXPIRED_TOKEN: expired token
- INVALID_TOKEN: invalid token
- M2M_FULL_ACCESS_TOKEN: M2M full access token
- M2M_READ_ACCESS_TOKEN: M2M read access token
- M2M_UPDATE_ACCESS_TOKEN: M2M update (including 'delete') access token
- S3_ENDPOINT: endpoint of AWS S3 API, for unit and e2e test only; default to `localhost:9000`

### Prepare

- Start Local services in docker.
- Create tables.
- Various config parameters should be properly set.

Seeding db data is not needed.

### Running unit tests

To run unit tests alone

```bash
npm run test
```

To run unit tests with coverage report

```bash
npm run test:cov
```

### Running integration tests

To run integration tests alone

```bash
npm run e2e
```

To run integration tests with coverage report

```bash
npm run e2e:cov
```

## Verification

Refer to the verification document `Verification.md`

## Notes

- after uploading attachments, the returned attachment ids should be used to update challenge;
  finally, attachments have challengeId field linking to their challenge,
  challenge also have attachments field linking to its attachments,
  this will speed up challenge CRUDS operations.

- In the app-constants.js Topics field, the used topics are using a test topic,
  the suggested ones are commented out, because these topics are not created in TC dev Kafka yet.
