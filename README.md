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
- [ES Processor](https://github.com/topcoder-platform/challenge-processor-es) - Updates data in ElasticSearch
- [Legacy Processor](https://github.com/topcoder-platform/legacy-challenge-processor) - Moves data from DynamoDB back to Informix
- [Legacy Migration Script](https://github.com/topcoder-platform/legacy-challenge-migration-script) - Moves data from Informix to DynamoDB
- [Frontend App](https://github.com/topcoder-platform/challenge-engine-ui)

## Prerequisites
- [NodeJS](https://nodejs.org/en/) (v10)
- [DynamoDB](https://aws.amazon.com/dynamodb/)
- [AWS S3](https://aws.amazon.com/s3/)
- [Elasticsearch v6](https://www.elastic.co/)
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
- AMAZON.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_REGION: The Amazon certificate region to use when connecting. Use local dynamodb you can set fake value
- AMAZON.IS_LOCAL_DB: Use Amazon DynamoDB Local or server.
- AMAZON.DYNAMODB_URL: The local url if using Amazon DynamoDB Local
- AMAZON.ATTACHMENT_S3_BUCKET: the AWS S3 bucket to store attachments
- ES: config object for Elasticsearch
- ES.HOST: Elasticsearch host
- ES.API_VERSION: Elasticsearch API version
- ES.ES_INDEX: Elasticsearch index name
- ES.ES_TYPE: Elasticsearch index type
- ES.ES_REFRESH: Elasticsearch refresh method. Default to string `true`(i.e. refresh immediately)
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
1. Drop/delete tables: `npm run drop-tables`
2. Creating tables: `npm run create-tables`
3. Seed/Insert data to tables: `npm run seed-tables`
4. Initialize/Clear database in default environment: `npm run init-db`
5. View table data in default environment: `npm run view-data <ModelName>`, ModelName can be `Challenge`, `ChallengeType`, `AuditLog`, `Phase`, `TimelineTemplate`or `Attachment`
6. Create Elasticsearch index: `npm run init-es`, or to re-create index: `npm run init-es force`
7. Synchronize ES data and DynamoDB data: `npm run sync-es`
8. Start all the depending services for local deployment: `npm run services:up`
9. Stop all the depending services for local deployment: `npm run services:down`
10. Check the logs of all the depending services for local deployment: `npm run services:logs`
11. Initialize the local environments: `npm run local:init`
12. Reset the local environments: `npm run local:reset`


### Notes
- The seed data are located in `src/scripts/seed`

## Local Deployment
0. Make sure to use Node v10+ by command `node -v`. We recommend using [NVM](https://github.com/nvm-sh/nvm) to quickly switch to the right version:

   ```bash
   nvm use
   ```

1. 📦 Install npm dependencies

   ```bash
   npm install
   ```

2. ⚙ Local config   
  In the `challenge-api` root directory create `.env` file with the next environment variables. Values for **Auth0 config** should be shared with you on the forum.<br>
     ```bash
     # Auth0 config
     AUTH0_URL=
     AUTH0_PROXY_SERVER_URL=
     AUTH0_AUDIENCE=
     AUTH0_CLIENT_ID=
     AUTH0_CLIENT_SECRET=

     # Locally deployed services (via docker-compose)
     IS_LOCAL_DB=true
     DYNAMODB_URL=http://localhost:8000
     ```

    - Values from this file would be automatically used by many `npm` commands.
    - ⚠️ Never commit this file or its copy to the repository!

3. 🚢 Start docker-compose with services which are required to start Topcoder Challenges API locally

   ```bash
   npm run services:up
   ```
   
4. ♻ Update following two parts:
- https://github.com/topcoder-platform/challenge-api/blob/develop/src/models/Challenge.js#L116
  `throughput: 'ON_DEMAND',` should be updated to `throughput:{ read: 4, write: 2 },`
- https://github.com/topcoder-platform/challenge-api/blob/develop/config/default.js#L27-L28

5. ♻ Create tables.

   ```bash
   npm run create-tables
   # Use `npm run drop-tables` to drop tables.
   ```

6. ♻ Init DB, ES

   ```bash
   npm run local:init
   ```

   This command will do 3 things:
  - create Elasticsearch indexes (drop if exists)
  - Initialize the database by cleaning all the records.
  - Import the data to the local database and index it to ElasticSearch

7. 🚀 Start Topcoder Challenge API

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
- Create DynamoDB tables.
- Initialize ES index.
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
