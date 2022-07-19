/**
 * This service provides operations of timeline template.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const config = require('config')
const logger = require('tc-framework').logger(config)
const constants = require('../../app-constants')

/**
 * Search timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchTimelineTemplates (criteria) {
  const span = await logger.startSpan('TimelineTemplateService.searchTimelineTemplates')
  const page = criteria.page || 1
  const perPage = criteria.perPage || 50
  const list = await helper.scanAll('TimelineTemplate')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name))
  const total = records.length
  const result = records.slice((page - 1) * perPage, page * perPage)

  await logger.endSpan(span)
  return { total, page, perPage, result }
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
  const span = await logger.startSpan('TimelineTemplateService.createTimelineTemplate')
  await helper.validateDuplicate('TimelineTemplate', 'name', timelineTemplate.name)
  await helper.validatePhases(timelineTemplate.phases)

  const ret = await helper.create('TimelineTemplate', _.assign({ id: uuid() }, timelineTemplate))
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateCreated, ret)
  await logger.endSpan(span)
  return ret
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
  const span = await logger.startSpan('TimelineTemplateService.getTimelineTemplate')
  const res = await helper.getById('TimelineTemplate', timelineTemplateId)
  await logger.endSpan(span)
  return res
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
  const span = await logger.startSpan('TimelineTemplateService.update')
  const timelineTemplate = await helper.getById('TimelineTemplate', timelineTemplateId)

  if (data.name && data.name.toLowerCase() !== timelineTemplate.name.toLowerCase()) {
    await helper.validateDuplicate('TimelineTemplate', 'name', data.name)
  }

  if (data.phases) {
    await helper.validatePhases(data.phases)
  }

  if (isFull) {
    // description is optional field, can be undefined
    timelineTemplate.description = data.description
  }

  const ret = await helper.update(timelineTemplate, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateUpdated,
    isFull ? ret : _.assignIn({ id: timelineTemplateId }, data))
  await logger.endSpan(span)
  return ret
}

/**
 * Fully update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function fullyUpdateTimelineTemplate (timelineTemplateId, data) {
  const span = await logger.startSpan('TimelineTemplateService.fullyUpdateTimelineTemplate')
  const res = await update(timelineTemplateId, data, true)
  await logger.endSpan(span)
  return res
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
  const span = await logger.startSpan('TimelineTemplateService.partiallyUpdateTimelineTemplate')
  const res = await update(timelineTemplateId, data)
  await logger.endSpan(span)
  return res
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
  const span = await logger.startSpan('TimelineTemplateService.deleteTimelineTemplate')
  const ret = await helper.getById('TimelineTemplate', timelineTemplateId)
  await ret.delete()
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateDeleted, ret)
  await logger.endSpan(span)
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

// logger.buildService(module.exports)
