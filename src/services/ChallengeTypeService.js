/**
 * This service provides operations of challenge tracks.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const config = require('config')
const logger = require('tc-framework').logger(config)
const constants = require('../../app-constants')

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallengeTypes (criteria) {
  const span = await logger.startSpan('ChallengeTypeService.searchChallengeTracks')
  // TODO - move this to ES
  let records = helper.getFromInternalCache('ChallengeType')
  if (records == null) {
    records = await helper.scanAll('ChallengeType')
    helper.setToInternalCache('ChallengeType', records)
  }
  const page = criteria.page || 1
  const perPage = criteria.perPage || 50

  if (criteria.name) records = _.filter(records, e => helper.partialMatch(criteria.name, e.name))
  if (criteria.description) records = _.filter(records, e => helper.partialMatch(criteria.description, e.description))
  if (criteria.abbreviation) records = _.filter(records, e => helper.partialMatch(criteria.abbreviation, e.abbreviation))
  if (!_.isUndefined(criteria.isActive)) records = _.filter(records, e => (e.isActive === (criteria.isActive === 'true')))
  if (!_.isUndefined(criteria.isTask)) records = _.filter(records, e => (e.isTask === (criteria.isTask === 'true')))

  const total = records.length
  const result = records.slice((page - 1) * perPage, page * perPage)

  await logger.endSpan(span)
  return { total, page, perPage, result }
}

searchChallengeTypes.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.number().integer().min(1).max(100).default(100),
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    isTask: Joi.boolean().default(false),
    abbreviation: Joi.string()
  })
}

/**
 * Create challenge type.
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeType (type) {
  const span = await logger.startSpan('ChallengeTypeService.createChallengeType')
  await helper.validateDuplicate('ChallengeType', 'name', type.name)
  await helper.validateDuplicate('ChallengeType', 'abbreviation', type.abbreviation)
  const ret = await helper.create('ChallengeType', _.assign({ id: uuid() }, type))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeCreated, ret)
  await logger.endSpan(span)
  return ret
}

createChallengeType.schema = {
  type: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    isTask: Joi.boolean().default(false),
    abbreviation: Joi.string().required()
  }).required()
}

/**
 * Get challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the challenge type with given id
 */
async function getChallengeType (id) {
  const span = await logger.startSpan('ChallengeTypeService.getChallengeType')
  const ret = await helper.getById('ChallengeType', id)
  await logger.endSpan(span)
  return ret
}

getChallengeType.schema = {
  id: Joi.id()
}

/**
 * Fully update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeType (id, data) {
  const span = await logger.startSpan('ChallengeTypeService.fullyUpdateChallengeType')
  const type = await helper.getById('ChallengeType', id)
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeType', 'name', data.name)
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await helper.validateDuplicate('ChallengeType', 'abbreviation', data.abbreviation)
  }
  if (_.isUndefined(data.description)) {
    type.description = undefined
  }
  const ret = await helper.update(type, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, ret)
  await logger.endSpan(span)
  return ret
}

fullyUpdateChallengeType.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    isTask: Joi.boolean().default(false),
    abbreviation: Joi.string().required()
  }).required()
}

/**
 * Partially update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeType (id, data) {
  const span = await logger.startSpan('ChallengeTypeService.partiallyUpdateChallengeType')
  const type = await helper.getById('ChallengeType', id)
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeType', 'name', data.name)
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await helper.validateDuplicate('ChallengeType', 'abbreviation', data.abbreviation)
  }
  const ret = await helper.update(type, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, _.assignIn({ id }, data))
  await logger.endSpan(span)
  return ret
}

partiallyUpdateChallengeType.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    isTask: Joi.boolean().default(false),
    abbreviation: Joi.string()
  }).required()
}

/**
 * Delete challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the deleted challenge type
 */
async function deleteChallengeType (id) {
  const ret = await helper.getById('ChallengeType', id)
  await ret.delete()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeDeleted, ret)
  return ret
}

deleteChallengeType.schema = {
  id: Joi.id()
}

module.exports = {
  searchChallengeTypes,
  createChallengeType,
  getChallengeType,
  fullyUpdateChallengeType,
  partiallyUpdateChallengeType,
  deleteChallengeType
}

// logger.buildService(module.exports)
