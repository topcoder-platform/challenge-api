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
  let records = await helper.scanAll('ChallengeTimelineTemplate')
  if (criteria.typeId) records = _.filter(records, e => (criteria.typeId === e.typeId))
  if (criteria.trackId) records = _.filter(records, e => (criteria.trackId === e.trackId))
  if (criteria.timelineTemplateId) records = _.filter(records, e => (criteria.timelineTemplateId === e.timelineTemplateId))
  if (!_.isUndefined(criteria.isDefault)) records = _.filter(records, e => (e.isDefault === (_.toLower(_.toString(criteria.isDefault)) === 'true')))
  return {
    total: records.length,
    page: 1,
    perPage: Math.max(records.length, 10),
    result: records
  }
}

searchChallengeTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    typeId: Joi.optionalId(),
    trackId: Joi.optionalId(),
    timelineTemplateId: Joi.optionalId(),
    isDefault: Joi.boolean()
  })
}

/**
 * Unset existing default timeline template in order to create a new one
 * @param {String} typeId the type ID
 * @param {String} trackId the track ID
 */
async function unsetDefaultTimelineTemplate (typeId, trackId) {
  const records = await searchChallengeTimelineTemplates({ typeId, trackId, isDefault: true })
  if (records.total === 0) {
    return
  }
  for (const record of records.result) {
    await fullyUpdateChallengeTimelineTemplate(record.id, { ...record, isDefault: false })
  }
}

/**
 * Create challenge type timeline template.
 * @param {Object} data the data to create challenge type timeline template
 * @returns {Object} the created challenge type timeline template
 */
async function createChallengeTimelineTemplate (data) {
  // check duplicate
  const records = await searchChallengeTimelineTemplates(data)
  if (records.total > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('ChallengeTrack', data.trackId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(data.typeId, data.trackId)
  }

  const ret = await helper.create('ChallengeTimelineTemplate', _.assign({ id: uuid() }, data))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateCreated, ret)
  return ret
}

createChallengeTimelineTemplate.schema = {
  data: Joi.object().keys({
    typeId: Joi.id(),
    trackId: Joi.id(),
    timelineTemplateId: Joi.id(),
    isDefault: Joi.boolean().default(false).required()
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
    record.timelineTemplateId === data.timelineTemplateId &&
    record.isDefault === data.isDefault) {
    // no change
    return record
  }

  // check duplicate
  const records = await searchChallengeTimelineTemplates(data)
  if (records.total > 0) {
    throw new errors.ConflictError('The challenge type timeline template is already defined.')
  }
  // check exists
  await helper.getById('ChallengeType', data.typeId)
  await helper.getById('ChallengeTrack', data.trackId)
  await helper.getById('TimelineTemplate', data.timelineTemplateId)

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(data.typeId, data.trackId)
  }

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
