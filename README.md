# Topcoder Challenge API

## Dependencies

- nodejs https://nodejs.org/en/ (v10)
- DynamoDB
- AWS S3
- Docker, Docker Compose

## Configuration

Configuration for the application is at `config/default.js`.
The following parameters can be set in config files or in env variables:

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
- AMAZON.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting. Use local dynamodb you can set fake value
- AMAZON.AWS_REGION: The Amazon certificate region to use when connecting. Use local dynamodb you can set fake value
- AMAZON.IS_LOCAL_DB: Use Amazon DynamoDB Local or server.
- AMAZON.DYNAMODB_URL: The local url if using Amazon DynamoDB Local
- AMAZON.ATTACHMENT_S3_BUCKET: the AWS S3 bucket to store attachments
- FILE_UPLOAD_SIZE_LIMIT: the file upload size limit in bytes
- CHALLENGES_API_URL: TC challenges API base URL
- GROUPS_API_URL: TC groups API base URL
- COPILOT_RESOURCE_ROLE_IDS: copilot resource role ids allowed to upload attachment


Set the following environment variables so that the app can get TC M2M token (use 'set' insted of 'export' for Windows OS):

- export AUTH0_CLIENT_ID=8QovDh27SrDu1XSs68m21A1NBP8isvOt
- export AUTH0_CLIENT_SECRET=3QVxxu20QnagdH-McWhVz0WfsQzA1F8taDdGDI4XphgpEYZPcMTF4lX3aeOIeCzh
- export AUTH0_URL=https://topcoder-dev.auth0.com/oauth/token
- export AUTH0_AUDIENCE=https://m2m.topcoder-dev.com/


Also properly configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, ATTACHMENT_S3_BUCKET config parameters.


## DynamoDB Setup with Docker
We will use DynamoDB setup on Docker.
Note that you may need to modify regions in `local/init-dynamodb.sh` and `local/config`.

Just run `docker-compose up` in local folder

If you have already installed aws-cli in your local machine, you can execute `./local/init-dynamodb.sh` to
create the table. If not you can still create table following `Create Table via awscli in Docker`.

## Create Table via awscli in Docker
1. Make sure DynamoDB are running as per instructions above.

2. Run the following commands
```
docker exec -ti dynamodb sh
```
Next
```
./init-dynamodb.sh
```

3. Now the tables have been created, you can use following command to verify
```
aws dynamodb scan --table-name Challenge --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeType --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeSetting --endpoint-url http://localhost:7777
aws dynamodb scan --table-name AuditLog --endpoint-url http://localhost:7777
aws dynamodb scan --table-name Phase --endpoint-url http://localhost:7777
aws dynamodb scan --table-name TimelineTemplate --endpoint-url http://localhost:7777
aws dynamodb scan --table-name Attachment --endpoint-url http://localhost:7777
```

## Scripts
1. Drop/delete tables: `npm run drop-tables`
2. Creating tables: `npm run create-tables`
3. Seed/Insert data to tables: `npm run seed-tables`

### Notes
- The seed data are located in `src/scripts/seed`

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- Clear and init db `npm run init-db`
- Start app `npm start`
- App is running at `http://localhost:3000`

## Verification
Refer to the verification document `Verification.md`

## Notes

- after uploading attachments, the returned attachment ids should be used to update challenge;
  finally, attachments have challengeId field linking to their challenge,
  challenge also have attachments field linking to its attachments,
  this will speed up challenge CRUDS operations.

- updated swagger may be viewed and validated at `http://editor.swagger.io/`

