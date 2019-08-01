# TopCoder Challenge API Verification

## Postman tests
- clear the environment, run command `npm run init-db` and `npm run init-es force`
- import Postman collection and environment in the docs folder to Postman
- run tests from up to down in order
- You need to run command `npm run sync-es` before you run `Challenges/get challenge` and `Challenges/search challenge` test case.

## DynamoDB Verification
Run command `npm run view-data <ModelName>` to view table data, ModelName can be `Challenge`, `ChallengeType`, `ChallengeSetting`, `AuditLog`, `Phase`, `TimelineTemplate`or `Attachment`

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.

## ElasticSearch Verification

Run command `npm run view-es-data` to view data store in ES.

## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js Topics field for used topics, then click `View` button to view related messages

