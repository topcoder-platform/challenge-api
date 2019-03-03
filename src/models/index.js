/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

dynamoose.AWS.config.update({
  accessKeyId: config.DYNAMODB.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.DYNAMODB.AWS_SECRET_ACCESS_KEY,
  region: config.DYNAMODB.AWS_REGION
})

if (config.DYNAMODB.IS_LOCAL) {
  dynamoose.local(config.DYNAMODB.URL)
}

dynamoose.setDefaults({
  create: false,
  update: false
})

module.exports = {
  Challenge: dynamoose.model('Challenge', require('./Challenge')),
  ChallengeType: dynamoose.model('ChallengeType', require('./ChallengeType')),
  ChallengeSetting: dynamoose.model('ChallengeSetting', require('./ChallengeSetting')),
  AuditLog: dynamoose.model('AuditLog', require('./AuditLog'))
}
