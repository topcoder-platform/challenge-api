# TopCoder Challenge API Verification

## Postman tests
- import Postman collection and environment in the docs folder to Postman
- note that the Postman tests depend on the test data, so you must first run `npm run init-db` and `npm run test-data` to setup test data
- Just run the whole test cases under provided environment.

## DynamoDB Verification
1. Open a new console and run the command `docker exec -ti dynamodb sh` to use `aws-cli`

2. On the console you opened in step 1, run these following commands you can verify the data that inserted into database during the executing of postman tests
```
aws dynamodb scan --table-name Challenge --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeType --endpoint-url http://localhost:7777
aws dynamodb scan --table-name ChallengeSetting --endpoint-url http://localhost:7777
aws dynamodb scan --table-name AuditLog --endpoint-url http://localhost:7777
```
