/**
 * Initialize database tables. All data will be cleared.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Initialize database.')

const initDB = async () => {
  const auditLogs = await helper.scan('AuditLog')
  for (const auditLog of auditLogs) {
    await auditLog.delete()
  }
  const challenges = await helper.scan('Challenge')
  for (const challenge of challenges) {
    await challenge.delete()
  }
  const challengeTimelineTemplates = await helper.scan('ChallengeTimelineTemplate')
  for (const challengeTT of challengeTimelineTemplates) {
    await challengeTT.delete()
  }
  const types = await helper.scan('ChallengeType')
  for (const type of types) {
    await type.delete()
  }
  const phases = await helper.scan('Phase')
  for (const phase of phases) {
    await phase.delete()
  }
  const timelineTemplates = await helper.scan('TimelineTemplate')
  for (const timelineTemplate of timelineTemplates) {
    await timelineTemplate.delete()
  }
  const attachments = await helper.scan('Attachment')
  for (const attachment of attachments) {
    await attachment.delete()
  }
}

initDB().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
