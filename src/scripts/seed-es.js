/**
 * Seed ES
 */

const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const challengeTypes = require('./seed/ChallengeType.json')
const challengeTypeTimelineTemplates = require('./seed/ChallengeTypeTimelineTemplate.json')
const phases = require('./seed/Phase.json')
const timelineTemplates = require('./seed/TimelineTemplate.json')

const esClient = helper.getESClient()

/*
 * Migrate records from DB to ES
 */
async function seed () {
  for (const entry of challengeTypes) {
    await esClient.create({
      index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
      type: config.get('ES.CHALLENGE_TYPE_ES_TYPE'),
      refresh: config.get('ES.ES_REFRESH'),
      id: entry.id,
      body: { ...entry }
    })
  }
  logger.info(`Loaded ${challengeTypes.length} ChallengeTypes`)

  for (const entry of challengeTypeTimelineTemplates) {
    await esClient.create({
      index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
      type: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_TYPE'),
      refresh: config.get('ES.ES_REFRESH'),
      id: entry.id,
      body: { ...entry }
    })
  }
  logger.info(`Loaded ${challengeTypeTimelineTemplates.length} ChallengeTypeTimelineTemplates`)

  for (const entry of phases) {
    await esClient.create({
      index: config.get('ES.PHASE_ES_INDEX'),
      type: config.get('ES.PHASE_ES_TYPE'),
      refresh: config.get('ES.ES_REFRESH'),
      id: entry.id,
      body: { ...entry }
    })
  }
  logger.info(`Loaded ${phases.length} Phases`)

  for (const entry of timelineTemplates) {
    await esClient.create({
      index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
      type: config.get('ES.TIMELINE_TEMPLATE_ES_TYPE'),
      refresh: config.get('ES.ES_REFRESH'),
      id: entry.id,
      body: { ...entry }
    })
  }
  logger.info(`Loaded ${timelineTemplates.length} TimelineTemplates`)
}

seed()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
