# TopCoder Challenge API Verification

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


## Unit Test Coverage

299 passing (3m)

--------------------------------------|----------|----------|----------|----------|-------------------|
File                                  |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
--------------------------------------|----------|----------|----------|----------|-------------------|
All files                             |    84.68 |    69.84 |    87.98 |    84.86 |                   |
 challenge-api                        |      100 |      100 |      100 |      100 |                   |
  app-bootstrap.js                    |      100 |      100 |      100 |      100 |                   |
  app-constants.js                    |      100 |      100 |      100 |      100 |                   |
 challenge-api/config                 |      100 |    97.06 |      100 |      100 |                   |
  default.js                          |      100 |    96.43 |      100 |      100 |          18,49,59 |
  test.js                             |      100 |      100 |      100 |      100 |                   |
 challenge-api/src/common             |     87.8 |    63.33 |    94.12 |    87.91 |                   |
  errors.js                           |      100 |       50 |      100 |      100 |                23 |
  helper.js                           |    85.85 |     61.8 |    92.75 |     85.9 |... 37,868,881,905 |
  logger.js                           |    92.65 |    63.64 |      100 |    92.65 |   31,59,64,88,122 |
  s3ParseUrl.js                       |      100 |      100 |      100 |      100 |                   |
 challenge-api/src/models             |      100 |       50 |      100 |      100 |                   |
  Attachment.js                       |      100 |      100 |      100 |      100 |                   |
  AuditLog.js                         |      100 |      100 |      100 |      100 |                   |
  Challenge.js                        |      100 |      100 |      100 |      100 |                   |
  ChallengeTimelineTemplate.js        |      100 |      100 |      100 |      100 |                   |
  ChallengeTrack.js                   |      100 |      100 |      100 |      100 |                   |
  ChallengeType.js                    |      100 |      100 |      100 |      100 |                   |
  Phase.js                            |      100 |      100 |      100 |      100 |                   |
  TimelineTemplate.js                 |      100 |      100 |      100 |      100 |                   |
  index.js                            |      100 |       50 |      100 |      100 |              8,18 |
 challenge-api/src/services           |    82.65 |    68.25 |    83.92 |    82.82 |                   |
  AttachmentService.js                |    95.24 |     87.5 |      100 |    95.06 |   133,237,238,239 |
  AuditLogService.js                  |    92.86 |    71.43 |    83.33 |      100 |       16,17,20,23 |
  ChallengeService.js                 |     75.7 |    66.48 |     72.5 |    76.21 |... 1669,1716,1813 |
  ChallengeTimelineTemplateService.js |    92.06 |    70.83 |      100 |    90.91 | 46,47,113,119,127 |
  ChallengeTrackService.js            |    98.21 |    80.77 |      100 |    97.92 |                99 |
  ChallengeTypeService.js             |    98.31 |    78.57 |      100 |    97.96 |               100 |
  PhaseService.js                     |      100 |       75 |      100 |      100 |          18,19,81 |
  TimelineTemplateService.js          |      100 |    78.57 |      100 |      100 |          18,19,87 |
--------------------------------------|----------|----------|----------|----------|-------------------|


## E2E API Test Coverage

318 passing (3m)

-----------------------------------------|----------|----------|----------|----------|-------------------|
File                                     |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
-----------------------------------------|----------|----------|----------|----------|-------------------|
All files                                |    83.27 |    67.78 |    87.84 |    83.41 |                   |
 challenge-api                           |     93.1 |    79.69 |     96.3 |    92.59 |                   |
  app-bootstrap.js                       |      100 |      100 |      100 |      100 |                   |
  app-constants.js                       |      100 |      100 |      100 |      100 |                   |
  app-routes.js                          |    90.63 |    82.76 |    93.33 |    89.83 |... 67,103,104,108 |
  app.js                                 |     93.1 |    77.14 |      100 |     93.1 |      27,65,95,110 |
 challenge-api/config                    |      100 |    97.06 |      100 |      100 |                   |
  default.js                             |      100 |    96.43 |      100 |      100 |          18,49,59 |
  test.js                                |      100 |      100 |      100 |      100 |                   |
 challenge-api/src                       |      100 |      100 |      100 |      100 |                   |
  routes.js                              |      100 |      100 |      100 |      100 |                   |
 challenge-api/src/common                |    77.07 |    57.14 |    88.24 |    76.83 |                   |
  errors.js                              |      100 |       50 |      100 |      100 |                23 |
  helper.js                              |    72.96 |    55.62 |    85.51 |    72.46 |... 00,902,903,905 |
  logger.js                              |    92.65 |    68.18 |      100 |    92.65 |   31,59,64,88,122 |
  s3ParseUrl.js                          |    78.57 |     62.5 |      100 |    78.57 |          22,32,43 |
 challenge-api/src/controllers           |    98.52 |       50 |      100 |    98.52 |                   |
  AttachmentController.js                |      100 |      100 |      100 |      100 |                   |
  AuditLogController.js                  |      100 |      100 |      100 |      100 |                   |
  ChallengeController.js                 |      100 |      100 |      100 |      100 |                   |
  ChallengePhaseController.js            |      100 |      100 |      100 |      100 |                   |
  ChallengeTimelineTemplateController.js |      100 |      100 |      100 |      100 |                   |
  ChallengeTrackController.js            |      100 |      100 |      100 |      100 |                   |
  ChallengeTypeController.js             |      100 |      100 |      100 |      100 |                   |
  HealthController.js                    |    84.62 |       50 |      100 |    84.62 |             26,29 |
  TimelineTemplateController.js          |      100 |      100 |      100 |      100 |                   |
 challenge-api/src/models                |      100 |       50 |      100 |      100 |                   |
  Attachment.js                          |      100 |      100 |      100 |      100 |                   |
  AuditLog.js                            |      100 |      100 |      100 |      100 |                   |
  Challenge.js                           |      100 |      100 |      100 |      100 |                   |
  ChallengeTimelineTemplate.js           |      100 |      100 |      100 |      100 |                   |
  ChallengeTrack.js                      |      100 |      100 |      100 |      100 |                   |
  ChallengeType.js                       |      100 |      100 |      100 |      100 |                   |
  Phase.js                               |      100 |      100 |      100 |      100 |                   |
  TimelineTemplate.js                    |      100 |      100 |      100 |      100 |                   |
  index.js                               |      100 |       50 |      100 |      100 |              8,18 |
 challenge-api/src/services              |    81.76 |    66.11 |    82.52 |    82.05 |                   |
  AttachmentService.js                   |    92.86 |    81.25 |      100 |    92.59 |... 08,237,238,239 |
  AuditLogService.js                     |    85.71 |    64.29 |    66.67 |      100 |    16,17,20,23,24 |
  ChallengeService.js                    |     74.9 |     64.5 |    71.25 |    75.36 |... 1669,1716,1813 |
  ChallengeTimelineTemplateService.js    |    92.06 |    70.83 |      100 |    90.91 | 46,47,113,119,127 |
  ChallengeTrackService.js               |    98.21 |    76.92 |      100 |    97.92 |                99 |
  ChallengeTypeService.js                |    98.31 |       75 |      100 |    97.96 |               100 |
  PhaseService.js                        |      100 |       75 |      100 |      100 |          18,19,81 |
  TimelineTemplateService.js             |      100 |    78.57 |      100 |      100 |          18,19,87 |
-----------------------------------------|----------|----------|----------|----------|-------------------|
