/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

const awsConfigs = config.AMAZON.IS_LOCAL_DB ? {
  accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION
} : {
  region: config.AMAZON.AWS_REGION
}

dynamoose.AWS.config.update(awsConfigs)

if (config.AMAZON.IS_LOCAL_DB) {
  dynamoose.local(config.AMAZON.DYNAMODB_URL)
}

dynamoose.setDefaults({
  create: false,
  update: false,
  waitForActive: false
})

module.exports = {
  Challenge: dynamoose.model('Challenge', require('./Challenge')),
  ChallengeType: dynamoose.model('ChallengeType', require('./ChallengeType')),
  ChallengeTypeTimelineTemplate: dynamoose.model('ChallengeTypeTimelineTemplate', require('./ChallengeTypeTimelineTemplate')),
  AuditLog: dynamoose.model('AuditLog', require('./AuditLog')),
  Phase: dynamoose.model('Phase', require('./Phase')),
  TimelineTemplate: dynamoose.model('TimelineTemplate', require('./TimelineTemplate')),
  Attachment: dynamoose.model('Attachment', require('./Attachment'))
}
