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
async function searchChallengeTypeTimelineTemplates (criteria) {
  const list = await helper.scan('ChallengeTypeTimelineTemplate')
  const records = _.filter(list, e => (!criteria.typeId || criteria.typeId === e.typeId) &&
    (!criteria.timelineTemplateId || criteria.timelineTemplateId === e.timelineTemplateId))
  return records
}

searchChallengeTypeTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    typeId: Joi.optionalId(),
    timelineTemplateId: Joi.optionalId()
  })
}

/**
 * Create challenge type timeline template.
 * @param {Object} data the data to create challenge type timeline template
 * @returns {Object} the created challenge type timeline template
 */
async function createChallengeTypeTimelineTemplate (data) {
  // check duplicate
  const records = await searchChallengeTypeTimelineTemplates(data)
  if (records.length > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  const ret = await helper.create('ChallengeTypeTimelineTemplate', _.assign({ id: uuid() }, data))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeTimelineTemplateCreated, ret)
  return ret
}

createChallengeTypeTimelineTemplate.schema = {
  data: Joi.object().keys({
    typeId: Joi.id(),
    timelineTemplateId: Joi.id()
  }).required()
}

/**
 * Get challenge type timeline template.
 * @param {String} challengeTypeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the challenge type timeline template with given id
 */
async function getChallengeTypeTimelineTemplate (challengeTypeTimelineTemplateId) {
  return helper.getById('ChallengeTypeTimelineTemplate', challengeTypeTimelineTemplateId)
}

getChallengeTypeTimelineTemplate.schema = {
  challengeTypeTimelineTemplateId: Joi.id()
}

/**
 * Fully update challenge type timeline template.
 * @param {String} challengeTypeTimelineTemplateId the challenge type timeline template id
 * @param {Object} data the challenge type timeline template data to be updated
 * @returns {Object} the updated challenge type timeline template
 */
async function fullyUpdateChallengeTypeTimelineTemplate (challengeTypeTimelineTemplateId, data) {
  const record = await helper.getById('ChallengeTypeTimelineTemplate', challengeTypeTimelineTemplateId)

  if (record.typeId === data.typeId && record.timelineTemplateId === data.timelineTemplateId) {
    // no change
    return record
  }

  // check duplicate
  const records = await searchChallengeTypeTimelineTemplates(data)
  if (records.length > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  const ret = await helper.update(record, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeTimelineTemplateUpdated, ret)
  return ret
}

fullyUpdateChallengeTypeTimelineTemplate.schema = {
  challengeTypeTimelineTemplateId: Joi.id(),
  data: createChallengeTypeTimelineTemplate.schema.data
}

/**
 * Delete challenge type timeline template.
 * @param {String} challengeTypeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the deleted challenge type timeline template
 */
async function deleteChallengeTypeTimelineTemplate (challengeTypeTimelineTemplateId) {
  const ret = await helper.getById('ChallengeTypeTimelineTemplate', challengeTypeTimelineTemplateId)
  await ret.delete()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeTimelineTemplateDeleted, ret)
  return ret
}

deleteChallengeTypeTimelineTemplate.schema = {
  challengeTypeTimelineTemplateId: Joi.id()
}

module.exports = {
  searchChallengeTypeTimelineTemplates,
  createChallengeTypeTimelineTemplate,
  getChallengeTypeTimelineTemplate,
  fullyUpdateChallengeTypeTimelineTemplate,
  deleteChallengeTypeTimelineTemplate
}

// logger.buildService(module.exports)
