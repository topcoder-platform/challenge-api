# TopCoder Challenge API Verification

## Postman tests
- import Postman collection and environment in the docs folder to Postman
- run tests from up to down in order

## DynamoDB Verification
Run command `npm run view-data <ModelName>` to view table data, ModelName can be `Challenge`, `ChallengeType`, `ChallengeSetting`, `AuditLog`, `Phase`, `TimelineTemplate`or `Attachment`

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.


## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js Topics field for used topics, then click `View` button to view related messages

