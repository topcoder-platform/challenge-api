# TopCoder Challenge API Verification

## E2E Postman tests
- Import Postman collection and environment in the docs folder to Postman
- Set `token` variable in environment variables folder
- Open Runner
- Put E2E Test Folder inside Runner
- Set `Delay` to 2000ms
- Check `Save Responses`
- Start Run

## DynamoDB Verification
Run command `npm run view-data <ModelName>` to view table data, ModelName can be `Challenge`, `ChallengeType`, `AuditLog`, `Phase`, `TimelineTemplate`, `Attachment` or `ChallengeTimelineTemplate`

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.

## ElasticSearch Verification

Run command `npm run view-es-data` to view data store in ES.

## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js Topics field for used topics, then click `View` button to view related messages

