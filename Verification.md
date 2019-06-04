# TopCoder Challenge API Verification

## Postman tests
- import Postman collection and environment in the docs folder to Postman
- run tests from up to down in order

## DynamoDB Verification
1. Open a new console and run the command `docker exec -ti dynamodb sh` to use `aws-cli`

2. On the console you opened in step 1, run these following commands you can verify the data that inserted into database during the executing of postman tests
```
aws dynamodb scan --table-name Challenge --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeType --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeSetting --endpoint-url http://localhost:7777
aws dynamodb scan --table-name AuditLog --endpoint-url http://localhost:7777
aws dynamodb scan --table-name Phase --endpoint-url http://localhost:7777
aws dynamodb scan --table-name TimelineTemplate --endpoint-url http://localhost:7777
aws dynamodb scan --table-name Attachment --endpoint-url http://localhost:7777
```

## S3 Verification

Login to AWS Console, S3 service, view the bucket content.


## Bus Event Verification

- login `https://lauscher.topcoder-dev.com/` with credential `tonyj / appirio123`
- then select topic to view, see app-constants.js Topics field for used topics, then click `View` button to view related messages

