/**
 * This service provides operations of challenge type timeline template.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
// const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

/**
 * Search challenge type timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Array} the search result
 */
async function searchChallengeTimelineTemplates (criteria) {
  const list = await helper.scan('ChallengeTimelineTemplate')
  const records = _.filter(list, e => (!criteria.typeId || criteria.typeId === e.typeId) &&
  (!criteria.timelineTemplateId || criteria.timelineTemplateId === e.timelineTemplateId))
  return records
}

searchChallengeTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    typeId: Joi.optionalId(),
    trackId: Joi.optionalId(),
    timelineTemplateId: Joi.optionalId()
  })
}

/**
 * Create challenge type timeline template.
 * @param {Object} data the data to create challenge type timeline template
 * @returns {Object} the created challenge type timeline template
 */
async function createChallengeTimelineTemplate (data) {
  // check duplicate
  const records = await searchChallengeTimelineTemplates(data)
  if (records.length > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('ChallengeTrack', data.trackId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  const ret = await helper.create('ChallengeTimelineTemplate', _.assign({ id: uuid() }, data))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateCreated, ret)
  return ret
}

createChallengeTimelineTemplate.schema = {
  data: Joi.object().keys({
    typeId: Joi.id(),
    trackId: Joi.id(),
    timelineTemplateId: Joi.id()
  }).required()
}

/**
 * Get challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the challenge type timeline template with given id
 */
async function getChallengeTimelineTemplate (challengeTimelineTemplateId) {
  return helper.getById('ChallengeTimelineTemplate', challengeTimelineTemplateId)
}

getChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id()
}

/**
 * Fully update challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @param {Object} data the challenge type timeline template data to be updated
 * @returns {Object} the updated challenge type timeline template
 */
async function fullyUpdateChallengeTimelineTemplate (challengeTimelineTemplateId, data) {
  const record = await helper.getById('ChallengeTimelineTemplate', challengeTimelineTemplateId)

  if (record.typeId === data.typeId &&
    record.trackId === data.trackId &&
    record.timelineTemplateId === data.timelineTemplateId) {
    // no change
    return record
  }

  // check duplicate
  const records = await searchChallengeTimelineTemplates(data)
  if (records.length > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('ChallengeTrack', data.trackId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  const ret = await helper.update(record, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateUpdated, ret)
  return ret
}

fullyUpdateChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id(),
  data: createChallengeTimelineTemplate.schema.data
}

/**
 * Delete challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the deleted challenge type timeline template
 */
async function deleteChallengeTimelineTemplate (challengeTimelineTemplateId) {
  const ret = await helper.getById('ChallengeTimelineTemplate', challengeTimelineTemplateId)
  await ret.delete()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateDeleted, ret)
  return ret
}

deleteChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id()
}

module.exports = {
  searchChallengeTimelineTemplates,
  createChallengeTimelineTemplate,
  getChallengeTimelineTemplate,
  fullyUpdateChallengeTimelineTemplate,
  deleteChallengeTimelineTemplate
}

// logger.buildService(module.exports)
