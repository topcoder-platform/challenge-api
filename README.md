# Topcoder Challenge API

## Dependencies

- nodejs https://nodejs.org/en/ (v10)
- DynamoDB
- Docker, Docker Compose

## Configuration

Configuration for the application is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level, default is 'debug'
- PORT: the server port, default is 3000
- AUTH_SECRET: The authorization secret used during token verification.
- VALID_ISSUERS: The valid issuer of tokens.
- DYNAMODB.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting. Use local dynamodb you can set fake value
- DYNAMODB.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting. Use local dynamodb you can set fake value
- DYNAMODB.AWS_REGION: The Amazon certificate region to use when connecting. Use local dynamodb you can set fake value
- DYNAMODB.IS_LOCAL: Use Amazon DynamoDB Local or server.
- DYNAMODB.URL: The local url if using Amazon DynamoDB Local

## DynamoDB Setup with Docker
We will use DynamoDB setup on Docker.

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
```

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- Start app `npm start`
- App is running at `http://localhost:3000`
- Clear and init db `npm run init-db`

## Verification
Refer to the verification document `Verification.md`
