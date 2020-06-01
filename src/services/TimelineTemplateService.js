/**
 * This service provides operations of timeline template.
 */

const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

const esClient = helper.getESClient()

/**
 * Search timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchTimelineTemplates (criteria) {
  const mustQuery = []
  const boolQuery = []

  if (criteria.name) {
    boolQuery.push({ match: { name: `.*${criteria.name}.*` } })
  }

  if (boolQuery.length > 0) {
    mustQuery.push({
      bool: {
        filter: boolQuery
      }
    })
  }

  const esQuery = {
    index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
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
  const total = docs.hits.total
  let result = _.map(docs.hits.hits, item => item._source)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string()
  })
}

/**
 * Create timeline template.
 * @param {Object} timelineTemplate the timeline template to created
 * @returns {Object} the created timeline template
 */
async function createTimelineTemplate (timelineTemplate) {
  const [duplicate] = searchTimelineTemplates({ name: timelineTemplate.name })
  if (duplicate) {
    errors.ConflictError(`TimelineTemplate with name: ${timelineTemplate.name} already exist`)
  }

  await helper.validatePhases(timelineTemplate.phases)

  timelineTemplate = _.assign({ id: uuid() }, timelineTemplate)
  await esClient.create({
    index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.TIMELINE_TEMPLATE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: timelineTemplate.id,
    body: timelineTemplate
  })

  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateCreated, timelineTemplate)
  return timelineTemplate
}

createTimelineTemplate.schema = {
  timelineTemplate: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      predecessor: Joi.optionalId(),
      defaultDuration: Joi.number().positive().required()
    })).min(1).required()
  }).required()
}

/**
 * Get timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @returns {Object} the timeline template with given id
 */
async function getTimelineTemplate (timelineTemplateId) {
  return esClient.getSource({
    index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.TIMELINE_TEMPLATE_ES_TYPE'),
    id: timelineTemplateId
  })
}

getTimelineTemplate.schema = {
  timelineTemplateId: Joi.id()
}

/**
 * Update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated timeline template
 */
async function update (timelineTemplateId, data, isFull) {
  const timelineTemplate = await getTimelineTemplate(timelineTemplateId)

  if (data.name && data.name.toLowerCase() !== timelineTemplate.name.toLowerCase()) {
    const [duplicate] = searchTimelineTemplates({ name: timelineTemplate.name })
    if (duplicate) {
      errors.ConflictError(`TimelineTemplate with name: ${timelineTemplate.name} already exist`)
    }
  }

  if (data.phases) {
    await helper.validatePhases(data.phases)
  }

  if (isFull) {
    // description is optional field, can be undefined
    timelineTemplate.description = data.description

    await esClient.update({
      index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
      type: config.get('ES.TIMELINE_TEMPLATE_ES_TYPE'),
      refresh: config.get('ES.ES_REFRESH'),
      id: timelineTemplateId,
      body: {
        doc: timelineTemplate
      }
    })
  }

  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateUpdated,
    isFull ? timelineTemplate : _.assignIn({ id: timelineTemplateId }, data))
  return timelineTemplate
}

/**
 * Fully update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function fullyUpdateTimelineTemplate (timelineTemplateId, data) {
  return update(timelineTemplateId, data, true)
}

fullyUpdateTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      predecessor: Joi.optionalId(),
      defaultDuration: Joi.number().positive().required()
    })).min(1).required()
  }).required()
}

/**
 * Partially update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function partiallyUpdateTimelineTemplate (timelineTemplateId, data) {
  return update(timelineTemplateId, data)
}

partiallyUpdateTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      predecessor: Joi.optionalId(),
      defaultDuration: Joi.number().positive().required()
    })).min(1)
  }).required()
}

/**
 * Delete timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @returns {Object} the deleted timeline template
 */
async function deleteTimelineTemplate (timelineTemplateId) {
  const ret = await getTimelineTemplate(timelineTemplateId)
  await esClient.delete({
    index: config.get('ES.TIMELINE_TEMPLATE_ES_INDEX'),
    type: config.get('ES.TIMELINE_TEMPLATE_ES_TYPE'),
    id: timelineTemplateId
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateDeleted, ret)
  return ret
}

deleteTimelineTemplate.schema = {
  timelineTemplateId: Joi.id()
}

module.exports = {
  searchTimelineTemplates,
  createTimelineTemplate,
  getTimelineTemplate,
  fullyUpdateTimelineTemplate,
  partiallyUpdateTimelineTemplate,
  deleteTimelineTemplate
}

logger.buildService(module.exports)
