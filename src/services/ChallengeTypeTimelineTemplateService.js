/**
 * This service provides operations of challenge type timeline template.
 */

const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const challengeTypeService = require('./ChallengeTypeService')
const timelineTemplateService = require('./TimelineTemplateService')

const esClient = helper.getESClient()

/**
 * Search challenge type timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Array} the search result
 */
async function searchChallengeTypeTimelineTemplates (criteria) {
  const mustQuery = []
  const boolQuery = []

  if (criteria.typeId) {
    boolQuery.push({ match: { typeId: criteria.typeId } })
  }
  if (criteria.timelineTemplateId) {
    boolQuery.push({ match: { timelineTemplateId: criteria.timelineTemplateId } })
  }

  if (boolQuery.length > 0) {
    mustQuery.push({
      bool: {
        filter: boolQuery
      }
    })
  }

  const esQuery = {
    index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
    body: {
      query: mustQuery.length > 0 ? {
        bool: {
          must: mustQuery
        }
      } : {
        match_all: {}
      }
    }
  }

  // Search with constructed query
  let docs
  try {
    docs = await esClient.search(esQuery)
  } catch (e) {
    // Catch error when the ES is fresh and has no data
    docs = {
      hits: {
        total: 0,
        hits: []
      }
    }
  }

  // Extract data from hits
  let result = _.map(docs.hits.hits, item => item._source)

  return result
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
  const type = await challengeTypeService.getChallengeType(data.typeId)
  if (!type) {
    throw new errors.NotFoundError(`ChallengeType with id: ${data.typeId} doesn't exist`)
  }
  const timelineTemplate = await timelineTemplateService.getTimelineTemplate(data.timelineTemplateId)
  if (!timelineTemplate) {
    throw new errors.NotFoundError(`TimelineTemplate with id: ${data.timelineTemplateId} doesn't exist`)
  }

  data = _.assign({ id: uuid() }, data)

  await esClient.create({
    index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: data.id,
    body: data
  })

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeTimelineTemplateCreated, data)
  return data
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
  return esClient.getSource({
    index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_TYPE'),
    id: challengeTypeTimelineTemplateId
  })
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
  const record = await getChallengeTypeTimelineTemplate(challengeTypeTimelineTemplateId)

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
  const type = await challengeTypeService.getChallengeType(data.typeId)
  if (!type) {
    throw new errors.NotFoundError(`ChallengeType with id: ${data.typeId} doesn't exist`)
  }
  const timelineTemplate = await timelineTemplateService.getTimelineTemplate(data.timelineTemplateId)
  if (!timelineTemplate) {
    throw new errors.NotFoundError(`TimelineTemplate with id: ${data.timelineTemplateId} doesn't exist`)
  }

  _.extend(type, data)

  await esClient.update({
    index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: challengeTypeTimelineTemplateId,
    body: {
      doc: data
    }
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeTimelineTemplateUpdated, type)
  return type
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
  const ret = await getChallengeTypeTimelineTemplate(challengeTypeTimelineTemplateId)
  await esClient.delete({
    index: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_TYPE'),
    id: challengeTypeTimelineTemplateId
  })
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

logger.buildService(module.exports)
