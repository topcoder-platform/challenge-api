# TopCoder Challenge API Verification

## Newman tests
- set config/test environments,
- run command `npm install`
- run command `eslint test/postman`
- run command `docker-compose up` inside local folder. Wait for services to start
- if tables are already created then run command `npm run drop-tables` to clear data
- run command `npm run create-tables`
- run command `npm run init-es force` to clear challenge data. Don't mind if it throws error, we just need it to clear indexes.
- run command `NODE_ENV=test npm start`
- run command `npm run test:newman`

## Postman tests
- clear the environment, run command `npm run init-db` and `npm run init-es force`
- import Postman collection and environment in the docs folder to Postman
- run tests from up to down in order
- You need to run command `npm run sync-es` before you run `Challenges/get challenge` and `Challenges/search challenge` test case.

## DynamoDB Verification
Run command `npm run view-data <ModelName>` to view table data, ModelName can be `Challenge`, `ChallengeType`, `AuditLog`, `Phase`, `TimelineTemplate`, `Attachment` or `ChallengeTimelineTemplate`

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.

## ElasticSearch Verification

Run command `npm run view-es-data` to view data store in ES.

## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js Topics field for used topics, then click `View` button to view related messages

