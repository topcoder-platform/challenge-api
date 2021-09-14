/**
 * This service provides operations for clearing the data from automated tests
 */

const _ = require('lodash')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const constants = require('../../app-constants')

/**
 * Delete the Resource from the ES by the given id
 * @param id the resource id
 * @returns {Promise<void>}
 */
const deleteFromESById = async (id) => {
  // delete from ES
  const esClient = await helper.getESClient()
  await esClient.delete({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: id,
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })
}

/**
 * Clear the postman test data. The main function of this class.
 * @returns {Promise<void>}
 */
const cleanUpTestData = async () => {
  logger.info('clear the test data from postman test!')

  // get all challenges from database
  let challenges = await helper.scanAll('Challenge')

  // get all audit logs
  let auditLogs = await helper.scanAll('AuditLog')

  // set audit logs in a map according to challenge id
  let auditlogMap = {}
  for (let log of auditLogs) {
    if (auditlogMap[log.challengeId]) {
      auditlogMap[log.challengeId].push(log)
      continue
    }
    auditlogMap[log.challengeId] = [log]
  }

  // get all attachments
  let attachments = await helper.scanAll('Attachment')

  // set attachments in a map according to challenge id
  let attachmentMap = {}
  for (let att of attachments) {
    if (attachmentMap[att.challengeId]) {
      attachmentMap[att.challengeId].push(att)
      continue
    }
    attachmentMap[att.challengeId] = [att]
  }

  // filter challenges to only those generated during postman tests
  challenges = _.filter(challenges, ch => (ch.name.startsWith(config.AUTOMATED_TESTING_NAME_PREFIX)))

  for (let challenge of challenges) {
    await challenge.delete()
    await deleteFromESById(challenge.id)

    // delete audit logs for the challenge if any
    if (auditlogMap[challenge.id]) {
      for (let log of auditlogMap[challenge.id]) {
        log.delete()
      }
      delete auditlogMap[challenge.id]
    }

    // delete attachments for challenge if any
    if (attachmentMap[challenge.id]) {
      for (let att of attachmentMap[challenge.id]) {
        att.delete()
        // post bus event
        await helper.postBusEvent(constants.Topics.ChallengeAttachmentDeleted, att)
      }
    }
    await helper.postBusEvent(constants.Topics.ChallengeDeleted, { id: challenge.id }) // for consistency as bus event is posted while creating
  }

  // get all challenge timeline templates
  let challengeTimeTempl = await helper.scanAll('ChallengeTimelineTemplate')
  challengeTimeTempl = challengeTimeTempl.filter(Boolean)
  // get all challenge types and filter out those created during postman test
  let challengeTypes = await helper.scanAll('ChallengeType')
  challengeTypes = _.filter(challengeTypes, type => (type.name.startsWith(config.AUTOMATED_TESTING_NAME_PREFIX)))

  // delete challenge types and the corresponding challenge timeline templates
  for (let type of challengeTypes) {
    // get challenge timeline templates using this challenge type and delete
    for (let i = 0; i < challengeTimeTempl.length; i++) {
      if (challengeTimeTempl[i].typeId === type.id) {
        await challengeTimeTempl[i].delete()

        // post bus event
        await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateDeleted, challengeTimeTempl[i])

        delete challengeTimeTempl[i]
      }
    }

    type.delete()
  }

  // remove deleted challenge timeline templates
  challengeTimeTempl = challengeTimeTempl.filter(Boolean)

  // get all timeline templates and filter for postman test
  let timelineTemplates = await helper.scanAll('TimelineTemplate')
  timelineTemplates = _.filter(timelineTemplates, templ => templ => (templ.name.startsWith(config.AUTOMATED_TESTING_NAME_PREFIX)))

  // delete timeline templates
  for (let templ of timelineTemplates) {
    // delete challenge templates for the given timeline templates
    for (let i = 0; i < challengeTimeTempl.length; i++) {
      if (challengeTimeTempl[i].timelineTemplateId === templ.id) {
        await challengeTimeTempl[i].delete()

        // post bus event
        await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateDeleted, challengeTimeTempl[i])

        delete challengeTimeTempl[i]
      }
    }

    await templ.delete()

    // post bus event
    await helper.postBusEvent(constants.Topics.TimelineTemplateDeleted, templ)
  }

  // get all challenge tracks and filter
  let challengeTracks = await helper.scanAll('ChallengeTrack')
  challengeTracks = _.filter(challengeTracks, track => (track.name.startsWith(config.AUTOMATED_TESTING_NAME_PREFIX)))

  // remove deleted challenge timeline templates
  challengeTimeTempl = challengeTimeTempl.filter(Boolean)

  // delete challenge tracks
  for (let track of challengeTracks) {
    // delete challenge timeline templates for the given challenge track
    for (let i = 0; i < challengeTimeTempl.length; i++) {
      if (challengeTimeTempl[i].trackId === track.id) {
        await challengeTimeTempl[i].delete()

        // post bus event
        await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateDeleted, challengeTimeTempl[i])

        delete challengeTimeTempl[i]
      }
    }

    track.delete()
  }

  // get phases and filter
  let phases = await helper.scanAll('Phase')
  phases = _.filter(phases, phase => (phase.description.startsWith(config.AUTOMATED_TESTING_NAME_PREFIX)))

  // delete phases
  for (let phase of phases) {
    await phase.delete()
    await helper.postBusEvent(constants.Topics.ChallengePhaseDeleted, phase)
  }
}

module.exports = {
  cleanUpTestData
}

logger.buildService(module.exports)
